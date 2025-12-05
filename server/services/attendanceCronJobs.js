const cron = require('node-cron');
const Attendance = require('../models/Attendance');
const DailyAttendance = require('../models/DailyAttendance');
const Aim = require('../models/Aim');
const User = require('../models/User');

// ============================================
// DAILY ATTENDANCE DATA PERSISTENCE SERVICE
// ============================================
// This service ensures attendance data is permanently stored at end of day

/**
 * Auto-end active work sessions and persist data to DailyAttendance
 * Runs at 11:59 PM every day
 */
function startAttendancePersistenceCron() {
  // Run at 11:59 PM every day
  cron.schedule('59 23 * * *', async () => {
    console.log('🔄 [CRON] Starting end-of-day attendance persistence...');
    
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Find all attendance records from today
      const todayAttendance = await Attendance.find({
        date: { $gte: today, $lt: tomorrow }
      }).populate('user', 'name email department');

      // Get all AIMS from today
      const todayAims = await Aim.find({
        date: { $gte: today, $lt: tomorrow }
      });

      const aimMap = new Map();
      todayAims.forEach(aim => {
        aimMap.set(aim.user.toString(), aim);
      });

      let persistedCount = 0;
      let autoEndedCount = 0;

      for (const attendance of todayAttendance) {
        if (!attendance.user) continue;
        
        const userId = attendance.user._id;
        const aim = aimMap.get(userId.toString());
        
        // Auto-end day if not already ended
        const now = new Date();
        let endTime = attendance.endDayTime;
        let hoursWorked = attendance.hoursWorked || 0;
        
        if (!endTime && attendance.startDayTime) {
          // Auto-end for users who forgot to end their day
          endTime = now;
          hoursWorked = (endTime - attendance.startDayTime) / (1000 * 60 * 60);
          
          attendance.endDayTime = endTime;
          attendance.hoursWorked = Math.round(hoursWorked * 100) / 100;
          attendance.autoEnded = true;
          attendance.employeeNotes = (attendance.employeeNotes || '') + ' [Auto-ended by system]';
          await attendance.save();
          
          autoEndedCount++;
          console.log(`✅ Auto-ended day for user ${attendance.user.name}`);
        }

        // Create or update DailyAttendance record
        let dailyRecord = await DailyAttendance.findOne({
          user: userId,
          date: { $gte: today, $lt: tomorrow }
        });

        if (!dailyRecord) {
          // Create new daily record
          dailyRecord = new DailyAttendance({
            user: userId,
            date: today,
            startDayTime: attendance.startDayTime,
            endDayTime: endTime,
            totalHoursWorked: hoursWorked,
            workLocationType: attendance.workLocationType || 'Office',
            startDayLocation: attendance.startDayLocation,
            endDayLocation: attendance.endDayLocation,
            isPresent: !!attendance.startDayTime,
            status: attendance.startDayTime ? 'Present' : 'Absent',
            verificationMethod: attendance.verificationMethod || 'manual',
            dailyProgressCompleted: !!attendance.progressSubmitted,
            dailyAimCompleted: aim ? (aim.completionStatus !== 'Pending') : false,
            aimCompletionStatus: aim?.completionStatus || 'Not Set',
            aimCompletionComment: aim?.completionComment || '',
            autoEnded: attendance.autoEnded || false
          });
        } else {
          // Update existing record
          dailyRecord.endDayTime = endTime;
          dailyRecord.totalHoursWorked = hoursWorked;
          dailyRecord.endDayLocation = attendance.endDayLocation;
          dailyRecord.dailyProgressCompleted = !!attendance.progressSubmitted;
          dailyRecord.dailyAimCompleted = aim ? (aim.completionStatus !== 'Pending') : false;
          dailyRecord.aimCompletionStatus = aim?.completionStatus || 'Not Set';
          dailyRecord.aimCompletionComment = aim?.completionComment || '';
          dailyRecord.autoEnded = attendance.autoEnded || false;
        }

        await dailyRecord.save();
        persistedCount++;
      }

      // Handle employees who didn't start their day (mark as absent)
      const activeUsers = await User.find({ stillExist: 1 }).select('_id');
      const attendedUserIds = new Set(todayAttendance.map(a => a.user._id.toString()));
      
      for (const user of activeUsers) {
        const userId = user._id.toString();
        if (!attendedUserIds.has(userId)) {
          // Check if they have an AIM (present via AIM only)
          const aim = aimMap.get(userId);
          
          let dailyRecord = await DailyAttendance.findOne({
            user: user._id,
            date: { $gte: today, $lt: tomorrow }
          });

          if (!dailyRecord) {
            // Create absent record (unless they have AIMS)
            const isPresent = !!aim;
            dailyRecord = new DailyAttendance({
              user: user._id,
              date: today,
              isPresent: isPresent,
              status: isPresent ? 'Present' : 'Absent',
              totalHoursWorked: 0,
              dailyAimCompleted: aim ? (aim.completionStatus !== 'Pending') : false,
              aimCompletionStatus: aim?.completionStatus || 'Not Set',
              workLocationType: 'Not Applicable'
            });
            
            await dailyRecord.save();
            persistedCount++;
          }
        }
      }

      console.log(`✅ [CRON] End-of-day persistence complete:`);
      console.log(`   - ${persistedCount} DailyAttendance records persisted`);
      console.log(`   - ${autoEndedCount} users auto-ended`);
      
    } catch (error) {
      console.error('❌ [CRON] Error in attendance persistence:', error);
    }
  });

  console.log('📅 Attendance persistence cron job scheduled (11:59 PM daily)');
}

/**
 * Sync existing attendance records to DailyAttendance (run on server start)
 */
async function syncExistingAttendance() {
  try {
    console.log('🔄 Syncing existing attendance records to DailyAttendance...');
    
    // Get the last 30 days of attendance
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);
    
    const attendanceRecords = await Attendance.find({
      date: { $gte: thirtyDaysAgo }
    }).populate('user', 'name email');

    let syncedCount = 0;
    
    for (const attendance of attendanceRecords) {
      if (!attendance.user) continue;
      
      const dateStart = new Date(attendance.date);
      dateStart.setHours(0, 0, 0, 0);
      const dateEnd = new Date(dateStart);
      dateEnd.setDate(dateEnd.getDate() + 1);
      
      // Check if DailyAttendance already exists
      const existing = await DailyAttendance.findOne({
        user: attendance.user._id,
        date: { $gte: dateStart, $lt: dateEnd }
      });
      
      if (!existing && attendance.startDayTime) {
        // Create DailyAttendance record
        const hoursWorked = attendance.endDayTime 
          ? (attendance.endDayTime - attendance.startDayTime) / (1000 * 60 * 60)
          : 0;
        
        const dailyRecord = new DailyAttendance({
          user: attendance.user._id,
          date: attendance.date,
          startDayTime: attendance.startDayTime,
          endDayTime: attendance.endDayTime,
          totalHoursWorked: hoursWorked,
          workLocationType: attendance.workLocationType || 'Office',
          startDayLocation: attendance.startDayLocation,
          endDayLocation: attendance.endDayLocation,
          isPresent: true,
          status: 'Present',
          verificationMethod: attendance.verificationMethod || 'manual'
        });
        
        await dailyRecord.save();
        syncedCount++;
      }
    }
    
    console.log(`✅ Synced ${syncedCount} historical attendance records`);
    
  } catch (error) {
    console.error('❌ Error syncing existing attendance:', error);
  }
}

module.exports = {
  startAttendancePersistenceCron,
  syncExistingAttendance
};
