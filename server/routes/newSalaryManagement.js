const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const DailyAttendance = require('../models/DailyAttendance');
const Attendance = require('../models/Attendance');
const NewSalaryRecord = require('../models/NewSalaryRecord');
const User = require('../models/User');
const Aim = require('../models/Aim');

/**
 * ============================================
 * HOURS MANAGEMENT SECTION
 * ============================================
 */

/**
 * GET /api/new-salary/hours/all
 * Get all users with cumulative hours from AIMS for a date range
 * Query params: fromDate, toDate (ISO date strings)
 * Admin only
 */
router.get('/hours/all', auth, adminAuth, async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;

    console.log('📅 Received date filters:', { fromDate, toDate });

    // Parse date range - handle timezone issues
    let startDate, endDate;
    
    if (fromDate) {
      // Parse date string (YYYY-MM-DD format)
      const dateParts = fromDate.split('-');
      if (dateParts.length === 3) {
        const year = parseInt(dateParts[0]);
        const month = parseInt(dateParts[1]) - 1; // Month is 0-indexed
        const day = parseInt(dateParts[2]);
        
        if (isNaN(year) || isNaN(month) || isNaN(day)) {
          return res.status(400).json({
            success: false,
            error: `Invalid date format for fromDate: ${fromDate}. Please use YYYY-MM-DD format.`
          });
        }
        
        startDate = new Date(year, month, day);
        startDate.setHours(0, 0, 0, 0);
      } else {
        startDate = new Date(fromDate);
        if (isNaN(startDate.getTime())) {
          return res.status(400).json({
            success: false,
            error: `Invalid date format for fromDate: ${fromDate}. Please use YYYY-MM-DD format.`
          });
        }
        startDate.setHours(0, 0, 0, 0);
      }
    } else {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);
    }
    
    if (toDate) {
      // Parse date string (YYYY-MM-DD format)
      const dateParts = toDate.split('-');
      if (dateParts.length === 3) {
        const year = parseInt(dateParts[0]);
        const month = parseInt(dateParts[1]) - 1; // Month is 0-indexed
        const day = parseInt(dateParts[2]);
        
        if (isNaN(year) || isNaN(month) || isNaN(day)) {
          return res.status(400).json({
            success: false,
            error: `Invalid date format for toDate: ${toDate}. Please use YYYY-MM-DD format.`
          });
        }
        
        endDate = new Date(year, month, day);
        endDate.setHours(23, 59, 59, 999);
      } else {
        endDate = new Date(toDate);
        if (isNaN(endDate.getTime())) {
          return res.status(400).json({
            success: false,
            error: `Invalid date format for toDate: ${toDate}. Please use YYYY-MM-DD format.`
          });
        }
        endDate.setHours(23, 59, 59, 999);
      }
    } else {
      endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
    }

    // Validate dates
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format. Please use YYYY-MM-DD format.'
      });
    }

    if (startDate > endDate) {
      return res.status(400).json({
        success: false,
        error: 'Start date must be before end date.'
      });
    }

    console.log('📅 Parsed date range:', {
      fromDate: startDate.toISOString(),
      toDate: endDate.toISOString(),
      fromDateLocal: startDate.toLocaleString(),
      toDateLocal: endDate.toLocaleString(),
      fromDateQuery: fromDate,
      toDateQuery: toDate,
      daysInRange: Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1
    });

    // Get all active users
    const users = await User.find({ stillExist: 1 })
      .populate('department', 'name color')
      .select('name email department employeeId role')
      .lean();
    
    console.log(`Found ${users.length} active users`);

    if (!users || users.length === 0) {
      return res.json({
        success: true,
        data: {
          users: [],
          totalUsers: 0,
          totalCumulativeHours: 0,
          dateRange: {
            from: startDate.toISOString(),
            to: endDate.toISOString()
          }
        }
      });
    }

    // Get all AIMS records for the date range
    // Query for aims with workSessionInfo that has totalHoursWorked
    const userIds = users.map(u => u._id);
    
    // PRIMARY SOURCE: Get DailyAttendance records (most reliable source)
    console.log(`🔍 Querying DailyAttendance for ${userIds.length} users...`);
    console.log(`   Date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
    
    // Create date range query - ensure we're using Date objects
    // EXCLUDE auto-ended records (autoEnded === true) unless validated
    const dailyAttendanceQuery = {
      date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      },
      user: { $in: userIds },
      totalHoursWorked: { $gt: 0 },
      // Only include valid records (not auto-ended OR auto-ended but validated)
      $or: [
        { autoEnded: false }, // Normal records
        { autoEnded: true, spamStatus: 'Valid' } // Auto-ended but validated as valid
      ],
      // Exclude spam records
      spamStatus: { $ne: 'Spam' }
    };
    
    console.log(`   Query filter:`, {
      dateRange: { 
        $gte: new Date(startDate).toISOString(), 
        $lte: new Date(endDate).toISOString() 
      },
      userCount: userIds.length,
      totalHoursWorked: { $gt: 0 }
    });
    
    const dailyAttendanceRecords = await DailyAttendance.find(dailyAttendanceQuery)
    .select('user date totalHoursWorked')
    .lean();
    
    console.log(`✅ Found ${dailyAttendanceRecords.length} DailyAttendance records with hours > 0`);
    
    // Log sample records for debugging
    if (dailyAttendanceRecords.length > 0) {
      console.log(`   Sample records (first 3):`);
      dailyAttendanceRecords.slice(0, 3).forEach((record, idx) => {
        console.log(`     [${idx + 1}] User: ${record.user}, Date: ${record.date ? new Date(record.date).toISOString() : 'N/A'}, Hours: ${record.totalHoursWorked}`);
      });
      
      // Verify dates are in range
      const outOfRange = dailyAttendanceRecords.filter(r => {
        const recordDate = r.date ? new Date(r.date) : null;
        if (!recordDate) return true;
        return recordDate < startDate || recordDate > endDate;
      });
      
      if (outOfRange.length > 0) {
        console.warn(`   ⚠️ WARNING: ${outOfRange.length} records found outside date range!`);
      }
    } else {
      console.log(`   ⚠️ No records found. Checking if there's any data in DailyAttendance...`);
      
      // Check if there's ANY data for these users (without date filter)
      const anyRecords = await DailyAttendance.find({
        user: { $in: userIds },
        totalHoursWorked: { $gt: 0 }
      })
      .select('user date totalHoursWorked')
      .limit(5)
      .lean();
      
      if (anyRecords.length > 0) {
        console.log(`   ℹ️ Found ${anyRecords.length} records for these users (outside date range):`);
        anyRecords.forEach((record, idx) => {
          console.log(`     [${idx + 1}] User: ${record.user}, Date: ${record.date ? new Date(record.date).toISOString() : 'N/A'}, Hours: ${record.totalHoursWorked}`);
        });
      }
    }
    
    // SECONDARY SOURCE: Get Attendance records (if DailyAttendance has no data)
    let attendanceRecords = [];
    if (dailyAttendanceRecords.length === 0) {
      console.log('⚠️ No DailyAttendance records found, checking Attendance model...');
      const attendanceQuery = {
        date: {
          $gte: startDate,
          $lte: endDate
        },
        user: { $in: userIds },
        $or: [
          { hoursWorked: { $gt: 0 } },
          { totalHoursWorked: { $gt: 0 } }
        ],
        // Only include valid records (not auto-ended OR auto-ended but validated)
        $and: [
          {
            $or: [
              { autoEnded: false },
              { autoEnded: true, spamStatus: 'Valid' }
            ]
          },
          { spamStatus: { $ne: 'Spam' } }
        ]
      };
      
      attendanceRecords = await Attendance.find(attendanceQuery)
      .select('user date hoursWorked totalHoursWorked')
      .lean();
      
      console.log(`✅ Found ${attendanceRecords.length} Attendance records with hours > 0`);
    }
    
    // TERTIARY SOURCE: Get AIMS records (only if both DailyAttendance and Attendance have no data)
    let aimsRecords = [];
    if (dailyAttendanceRecords.length === 0 && attendanceRecords.length === 0) {
      console.log('No attendance records found, checking AIMS as fallback...');
      const allAimsRecords = await Aim.find({
        date: {
          $gte: startDate,
          $lte: endDate
        },
        user: { $in: userIds }
      })
      .select('user date workSessionInfo')
      .lean();
      
      console.log(`Found ${allAimsRecords.length} total AIMS records in date range`);
      
      // Filter to only those with valid hours
      aimsRecords = allAimsRecords.filter(aim => {
        const hours = aim.workSessionInfo?.totalHoursWorked;
        return hours && hours > 0;
      });

      console.log(`Found ${aimsRecords.length} AIMS records with hours > 0`);
    }

    // Calculate cumulative hours per user
    const userHoursMap = new Map();
    // Track unique dates per user to avoid double-counting days
    const userDatesMap = new Map(); // userId -> Set of date strings

    // Initialize all users with 0 hours
    users.forEach(user => {
      const userId = user._id.toString();
      userHoursMap.set(userId, {
        userId: user._id,
        name: user.name,
        email: user.email,
        employeeId: user.employeeId,
        department: user.department?.name || 'No Department',
        departmentColor: user.department?.color || 'bg-gray-500',
        role: user.role,
        cumulativeHours: 0,
        totalDays: 0
      });
      userDatesMap.set(userId, new Set());
    });

    // Helper function to normalize date to start of day for comparison
    const normalizeDate = (date) => {
      if (!date) return null;
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      return d;
    };

    // Helper function to get date string (YYYY-MM-DD) for comparison
    const getDateString = (date) => {
      const normalized = normalizeDate(date);
      if (!normalized) return null;
      return `${normalized.getFullYear()}-${String(normalized.getMonth() + 1).padStart(2, '0')}-${String(normalized.getDate()).padStart(2, '0')}`;
    };

    // Helper function to check if date is within range (strict comparison)
    const isDateInRange = (date) => {
      if (!date) return false;
      const normalized = normalizeDate(date);
      if (!normalized) return false;
      const normalizedStart = normalizeDate(startDate);
      const normalizedEnd = normalizeDate(endDate);
      
      // Compare dates (not times) - use getTime() for accurate comparison
      const dateOnly = normalized.getTime();
      const startOnly = normalizedStart.getTime();
      const endOnly = normalizedEnd.getTime();
      
      const inRange = dateOnly >= startOnly && dateOnly <= endOnly;
      
      if (!inRange && date) {
        console.log(`   ⚠️ Date ${normalized.toISOString()} is outside range ${normalizedStart.toISOString()} to ${normalizedEnd.toISOString()}`);
      }
      
      return inRange;
    };

    // Aggregate hours from DailyAttendance (PRIMARY SOURCE - most reliable)
    let recordsProcessed = 0;
    let recordsSkipped = 0;
    
    dailyAttendanceRecords.forEach(record => {
      if (!record.user) {
        recordsSkipped++;
        return;
      }
      
      const userId = record.user.toString ? record.user.toString() : record.user;
      const hours = record.totalHoursWorked || 0;
      const dateStr = getDateString(record.date);
      
      // Double-check date is in range (even though query should have filtered it)
      if (!isDateInRange(record.date)) {
        recordsSkipped++;
        return;
      }
      
      if (userHoursMap.has(userId) && hours > 0 && dateStr) {
        const userData = userHoursMap.get(userId);
        const userDates = userDatesMap.get(userId);
        
        // Only count unique dates
        if (!userDates.has(dateStr)) {
          userData.cumulativeHours += hours;
          userData.totalDays += 1;
          userDates.add(dateStr);
          recordsProcessed++;
        } else {
          recordsSkipped++;
        }
      } else {
        recordsSkipped++;
      }
    });
    
    console.log(`📊 DailyAttendance aggregation: ${recordsProcessed} processed, ${recordsSkipped} skipped`);
    
    // Aggregate hours from Attendance (SECONDARY SOURCE - only if DailyAttendance had no data)
    if (dailyAttendanceRecords.length === 0) {
      attendanceRecords.forEach(record => {
        if (!record.user) return;
        const userId = record.user.toString ? record.user.toString() : record.user;
        const hours = record.totalHoursWorked || record.hoursWorked || 0;
        const dateStr = getDateString(record.date);
        
        if (userHoursMap.has(userId) && hours > 0 && isDateInRange(record.date) && dateStr) {
          const userData = userHoursMap.get(userId);
          const userDates = userDatesMap.get(userId);
          
          // Only count unique dates
          if (!userDates.has(dateStr)) {
            userData.cumulativeHours += hours;
            userData.totalDays += 1;
            userDates.add(dateStr);
          }
        }
      });
      
      console.log(`Aggregated hours from Attendance model (secondary source)`);
    }
    
    // Aggregate hours from AIMS (TERTIARY SOURCE - only if both DailyAttendance and Attendance had no data)
    if (dailyAttendanceRecords.length === 0 && attendanceRecords.length === 0) {
      aimsRecords.forEach(aim => {
        if (!aim.user) return;
        
        const userId = aim.user.toString ? aim.user.toString() : aim.user;
        const hours = aim.workSessionInfo?.totalHoursWorked || 0;
        const dateStr = getDateString(aim.date);
        
        if (userHoursMap.has(userId) && hours > 0 && isDateInRange(aim.date) && dateStr) {
          const userData = userHoursMap.get(userId);
          const userDates = userDatesMap.get(userId);
          
          // Only count unique dates
          if (!userDates.has(dateStr)) {
            userData.cumulativeHours += hours;
            userData.totalDays += 1;
            userDates.add(dateStr);
          }
        }
      });
      
      console.log(`Aggregated hours from AIMS model (tertiary source)`);
    } else {
      console.log(`Aggregated hours from DailyAttendance model (primary source)`);
    }
    
    // Validate: totalDays should not exceed the number of days in the date range
    const maxDaysInRange = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
    console.log(`Date range: ${maxDaysInRange} days (${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]})`);

    // Convert map to array and sort by cumulative hours (descending)
    const usersWithHours = Array.from(userHoursMap.values())
      .map(user => ({
        ...user,
        cumulativeHours: Math.round(user.cumulativeHours * 100) / 100
      }))
      .sort((a, b) => b.cumulativeHours - a.cumulativeHours);
    
    // Log any users with days exceeding the range (indicates data issue)
    usersWithHours.forEach(user => {
      if (user.totalDays > maxDaysInRange) {
        console.warn(`⚠️ DATA ISSUE: User ${user.name} has ${user.totalDays} days but date range only has ${maxDaysInRange} days. This may indicate duplicate records or incorrect date filtering.`);
      }
    });

    const totalCumulativeHours = usersWithHours.reduce((sum, user) => sum + user.cumulativeHours, 0);
    
    // Log summary
    const usersWithData = usersWithHours.filter(u => u.cumulativeHours > 0).length;
    console.log(`📊 Summary:`);
    console.log(`   Total users: ${usersWithHours.length}`);
    console.log(`   Users with hours: ${usersWithData}`);
    console.log(`   Total cumulative hours: ${Math.round(totalCumulativeHours * 100) / 100}`);
    console.log(`   Date range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);

    res.json({
      success: true,
      data: {
        users: usersWithHours,
        totalUsers: usersWithHours.length,
        totalCumulativeHours: Math.round(totalCumulativeHours * 100) / 100,
        dateRange: {
          from: startDate.toISOString(),
          to: endDate.toISOString()
        },
        filterApplied: {
          fromDate: fromDate || null,
          toDate: toDate || null
        }
      }
    });
  } catch (error) {
    console.error('Error fetching all users hours:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch users hours data',
      details: error.message 
    });
  }
});

/**
 * GET /api/new-salary/debug/attendance
 * Debug endpoint to show actual attendance records in database
 * Query params: fromDate, toDate (ISO date strings)
 * Admin only
 */
router.get('/debug/attendance', auth, adminAuth, async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;

    // Parse date range
    let startDate, endDate;
    
    if (fromDate) {
      startDate = new Date(fromDate);
      if (fromDate.length === 10) {
        startDate.setHours(0, 0, 0, 0);
      }
    } else {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);
    }
    
    if (toDate) {
      endDate = new Date(toDate);
      if (toDate.length === 10) {
        endDate.setHours(23, 59, 59, 999);
      }
    } else {
      endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
    }

    // Get all active users
    const users = await User.find({ stillExist: 1 })
      .select('_id name email employeeId')
      .lean();

    const userIds = users.map(u => u._id);

    // Query AIMS
    const aimsRecords = await Aim.find({
      date: { $gte: startDate, $lte: endDate },
      user: { $in: userIds }
    })
    .select('user date workSessionInfo aims')
    .populate('user', 'name email')
    .lean();

    // Query DailyAttendance
    const dailyAttendanceRecords = await DailyAttendance.find({
      date: { $gte: startDate, $lte: endDate },
      user: { $in: userIds }
    })
    .select('user date startDayTime endDayTime totalHoursWorked biometricTimeIn biometricTimeOut')
    .populate('user', 'name email')
    .lean();

    // Query Attendance
    const attendanceRecords = await Attendance.find({
      date: { $gte: startDate, $lte: endDate },
      user: { $in: userIds }
    })
    .select('user date startDayTime endDayTime hoursWorked totalHoursWorked biometricTimeIn biometricTimeOut')
    .populate('user', 'name email')
    .lean();

    // Count records with hours
    const aimsWithHours = aimsRecords.filter(a => a.workSessionInfo?.totalHoursWorked > 0).length;
    const dailyAttWithHours = dailyAttendanceRecords.filter(a => a.totalHoursWorked > 0).length;
    const attWithHours = attendanceRecords.filter(a => (a.hoursWorked > 0 || a.totalHoursWorked > 0)).length;

    res.json({
      success: true,
      data: {
        dateRange: {
          from: startDate.toISOString(),
          to: endDate.toISOString()
        },
        summary: {
          totalUsers: users.length,
          aimsRecords: {
            total: aimsRecords.length,
            withHours: aimsWithHours
          },
          dailyAttendanceRecords: {
            total: dailyAttendanceRecords.length,
            withHours: dailyAttWithHours
          },
          attendanceRecords: {
            total: attendanceRecords.length,
            withHours: attWithHours
          }
        },
        sampleData: {
          aims: aimsRecords.slice(0, 5).map(a => ({
            userName: a.user?.name || 'Unknown',
            date: a.date,
            hasWorkSessionInfo: !!a.workSessionInfo,
            totalHoursWorked: a.workSessionInfo?.totalHoursWorked || 0,
            aims: a.aims?.substring(0, 50) + '...'
          })),
          dailyAttendance: dailyAttendanceRecords.slice(0, 5).map(a => ({
            userName: a.user?.name || 'Unknown',
            date: a.date,
            startDayTime: a.startDayTime,
            endDayTime: a.endDayTime,
            totalHoursWorked: a.totalHoursWorked || 0,
            biometricTimeIn: a.biometricTimeIn,
            biometricTimeOut: a.biometricTimeOut
          })),
          attendance: attendanceRecords.slice(0, 5).map(a => ({
            userName: a.user?.name || 'Unknown',
            date: a.date,
            startDayTime: a.startDayTime,
            endDayTime: a.endDayTime,
            hoursWorked: a.hoursWorked || 0,
            totalHoursWorked: a.totalHoursWorked || 0
          }))
        },
        allRecords: {
          aims: aimsRecords,
          dailyAttendance: dailyAttendanceRecords,
          attendance: attendanceRecords
        }
      }
    });
  } catch (error) {
    console.error('Error fetching debug attendance data:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch debug attendance data',
      details: error.message 
    });
  }
});

/**
 * GET /api/new-salary/hours/:userId
 * Get date-wise attendance hours for an employee
 * Query params: fromDate, toDate (ISO date strings)
 */
router.get('/hours/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { fromDate, toDate } = req.query;

    // Verify authorization
    if (req.user.id !== userId && req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Parse date range - handle both YYYY-MM-DD and other formats
    let startDate, endDate;
    
    if (fromDate) {
      startDate = new Date(fromDate);
      // If date string doesn't include time, set to start of day
      if (fromDate.length === 10) {
        startDate.setHours(0, 0, 0, 0);
      }
    } else {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);
    }
    
    if (toDate) {
      endDate = new Date(toDate);
      // If date string doesn't include time, set to end of day
      if (toDate.length === 10) {
        endDate.setHours(23, 59, 59, 999);
      }
    } else {
      endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
    }

    console.log('Querying hours for:', {
      userId,
      fromDate: startDate.toISOString(),
      toDate: endDate.toISOString(),
      fromDateQuery: fromDate,
      toDateQuery: toDate
    });

    // Fetch from DailyAttendance first (primary source)
    // EXCLUDE auto-ended records unless validated
    let dailyAttendanceQuery = {
      user: userId,
      date: {
        $gte: startDate,
        $lte: endDate
      },
      $or: [
        { startDayTime: { $exists: true } },
        { biometricTimeIn: { $exists: true } },
        { totalHoursWorked: { $gt: 0 } }
      ],
      // Only include valid records (not auto-ended OR auto-ended but validated)
      $and: [
        {
          $or: [
            { autoEnded: false },
            { autoEnded: true, spamStatus: 'Valid' }
          ]
        },
        { spamStatus: { $ne: 'Spam' } }
      ]
    };
    
    console.log('DailyAttendance query (with hours):', JSON.stringify(dailyAttendanceQuery, null, 2));
    
    let attendanceRecords = await DailyAttendance.find(dailyAttendanceQuery)
    .sort({ date: -1 })
    .select('date startDayTime endDayTime biometricTimeIn biometricTimeOut totalHoursWorked hoursWorked status');
    
    console.log(`DailyAttendance found: ${attendanceRecords.length} records`);
    
    // If still no records, try without the $or condition (just date range)
    if (attendanceRecords.length === 0) {
      console.log('Trying without hours requirement...');
      dailyAttendanceQuery = {
        user: userId,
        date: {
          $gte: startDate,
          $lte: endDate
        }
      };
      
      attendanceRecords = await DailyAttendance.find(dailyAttendanceQuery)
      .sort({ date: -1 })
      .select('date startDayTime endDayTime biometricTimeIn biometricTimeOut totalHoursWorked hoursWorked status');
      
      console.log(`DailyAttendance (without hours requirement) found: ${attendanceRecords.length} records`);
    }

    // If no records in DailyAttendance, try Attendance model
    if (attendanceRecords.length === 0) {
      console.log('No records in DailyAttendance, checking Attendance model...');
      
      // Try with hours requirement first
      let attendanceQuery = {
        user: userId,
        date: {
          $gte: startDate,
          $lte: endDate
        },
        $or: [
          { startDayTime: { $exists: true } },
          { biometricTimeIn: { $exists: true } },
          { hoursWorked: { $gt: 0 } }
        ]
      };
      
      console.log('Attendance query (with hours):', JSON.stringify(attendanceQuery, null, 2));
      
      let attendanceFromAttendance = await Attendance.find(attendanceQuery)
      .sort({ date: -1 })
      .select('date startDayTime endDayTime biometricTimeIn biometricTimeOut hoursWorked totalHoursWorked status');
      
      console.log(`Attendance model found: ${attendanceFromAttendance.length} records`);
      
      // If still no records, try without $or condition
      if (attendanceFromAttendance.length === 0) {
        console.log('Trying Attendance without hours requirement...');
        attendanceQuery = {
          user: userId,
          date: {
            $gte: startDate,
            $lte: endDate
          },
          // Only include valid records (not auto-ended OR auto-ended but validated)
          $and: [
            {
              $or: [
                { autoEnded: false },
                { autoEnded: true, spamStatus: 'Valid' }
              ]
            },
            { spamStatus: { $ne: 'Spam' } }
          ]
        };
        
        attendanceFromAttendance = await Attendance.find(attendanceQuery)
        .sort({ date: -1 })
        .select('date startDayTime endDayTime biometricTimeIn biometricTimeOut hoursWorked totalHoursWorked status');
        
        console.log(`Attendance (without hours requirement) found: ${attendanceFromAttendance.length} records`);
      }

      // Convert Attendance records to match DailyAttendance format
      attendanceRecords = attendanceFromAttendance.map(record => ({
        date: record.date,
        startDayTime: record.startDayTime,
        endDayTime: record.endDayTime,
        biometricTimeIn: record.biometricTimeIn,
        biometricTimeOut: record.biometricTimeOut,
        totalHoursWorked: record.totalHoursWorked || record.hoursWorked || 0,
        status: record.status || 'Present'
      }));
    }

    console.log(`Total found: ${attendanceRecords.length} attendance records`);
    
    if (attendanceRecords.length > 0) {
      console.log('Sample record:', {
        date: attendanceRecords[0].date,
        startDayTime: attendanceRecords[0].startDayTime,
        endDayTime: attendanceRecords[0].endDayTime,
        totalHoursWorked: attendanceRecords[0].totalHoursWorked
      });
    }

    // Format response
    const hoursData = attendanceRecords.map(record => {
      const checkIn = record.startDayTime || record.biometricTimeIn;
      const checkOut = record.endDayTime || record.biometricTimeOut;
      
      // Calculate hours if not already calculated
      let dailyHours = record.totalHoursWorked || record.hoursWorked || 0;
      
      // If hours not set but we have check-in and check-out, calculate it
      if (dailyHours === 0 && checkIn && checkOut) {
        const start = new Date(checkIn);
        const end = new Date(checkOut);
        const diffMs = end - start;
        dailyHours = Math.max(0, diffMs / (1000 * 60 * 60)); // Convert to hours
      }

      return {
        date: record.date,
        checkIn: checkIn ? new Date(checkIn).toISOString() : null,
        checkOut: checkOut ? new Date(checkOut).toISOString() : null,
        dailyHours: Math.round(dailyHours * 100) / 100,
        status: record.status || 'Present'
      };
    });

    // Calculate cumulative total
    const cumulativeTotal = hoursData.reduce((sum, record) => sum + record.dailyHours, 0);

    res.json({
      success: true,
      data: {
        hoursData,
        cumulativeTotal: Math.round(cumulativeTotal * 100) / 100,
        dateRange: {
          from: startDate.toISOString(),
          to: endDate.toISOString()
        },
        totalDays: hoursData.length
      }
    });
  } catch (error) {
    console.error('Error fetching hours:', error);
    res.status(500).json({ error: 'Failed to fetch hours data' });
  }
});

/**
 * ============================================
 * SALARY CALCULATION SECTION
 * ============================================
 */

/**
 * POST /api/new-salary/calculate
 * Calculate salary for an employee based on date range, holidays, and hourly rate
 */
router.post('/calculate', auth, adminAuth, async (req, res) => {
  try {
    const { userId, startDate, endDate, holidays, perHourRate, notes } = req.body;

    // Validation
    if (!userId || !startDate || !endDate || !perHourRate) {
      return res.status(400).json({ 
        error: 'Missing required fields: userId, startDate, endDate, perHourRate' 
      });
    }

    if (perHourRate <= 0) {
      return res.status(400).json({ error: 'Per hour rate must be greater than 0' });
    }

    // Parse dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    if (start > end) {
      return res.status(400).json({ error: 'Start date must be before end date' });
    }

    // Fetch working hours from attendance
    const attendanceRecords = await DailyAttendance.find({
      user: userId,
      date: {
        $gte: start,
        $lte: end
      },
      startDayTime: { $exists: true }
    }).select('date totalHoursWorked');

    // Calculate total working hours
    const workingHours = attendanceRecords.reduce((sum, record) => {
      return sum + (record.totalHoursWorked || 0);
    }, 0);

    // Process holidays (each holiday = 8 hours)
    const holidayDates = holidays && Array.isArray(holidays) ? holidays.map(h => new Date(h)) : [];
    const holidayHours = holidayDates.length * 8;

    // Calculate total cumulative hours
    const totalCumulativeHours = workingHours + holidayHours;

    // Calculate salary
    const calculatedSalary = totalCumulativeHours * perHourRate;

    // Create or update salary record
    const salaryRecord = await NewSalaryRecord.findOneAndUpdate(
      {
        user: userId,
        startDate: start,
        endDate: end
      },
      {
        user: userId,
        startDate: start,
        endDate: end,
        holidays: holidayDates.map(date => ({
          date: date,
          hours: 8
        })),
        workingHours: Math.round(workingHours * 100) / 100,
        holidayHours: holidayHours,
        totalCumulativeHours: Math.round(totalCumulativeHours * 100) / 100,
        perHourRate: perHourRate,
        calculatedSalary: Math.round(calculatedSalary * 100) / 100,
        calculatedBy: req.user.id,
        notes: notes || '',
        status: 'Calculated'
      },
      {
        upsert: true,
        new: true
      }
    ).populate('user', 'name email employeeId');

    res.json({
      success: true,
      data: {
        salaryRecord: {
          _id: salaryRecord._id,
          userId: salaryRecord.user._id,
          userName: salaryRecord.user.name,
          userEmail: salaryRecord.user.email,
          startDate: salaryRecord.startDate,
          endDate: salaryRecord.endDate,
          workingHours: salaryRecord.workingHours,
          holidayCount: holidayDates.length,
          holidayHours: salaryRecord.holidayHours,
          totalCumulativeHours: salaryRecord.totalCumulativeHours,
          perHourRate: salaryRecord.perHourRate,
          calculatedSalary: salaryRecord.calculatedSalary,
          notes: salaryRecord.notes,
          calculatedAt: salaryRecord.calculatedAt
        }
      }
    });
  } catch (error) {
    console.error('Error calculating salary:', error);
    res.status(500).json({ error: 'Failed to calculate salary', details: error.message });
  }
});

/**
 * GET /api/new-salary/records/:userId
 * Get all salary records for an employee
 */
router.get('/records/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;

    // Verify authorization
    if (req.user.id !== userId && req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const records = await NewSalaryRecord.find({ user: userId })
      .sort({ calculatedAt: -1 })
      .populate('calculatedBy', 'name email')
      .select('-__v');

    res.json({
      success: true,
      data: records
    });
  } catch (error) {
    console.error('Error fetching salary records:', error);
    res.status(500).json({ error: 'Failed to fetch salary records' });
  }
});

/**
 * GET /api/new-salary/records
 * Get all salary records (Admin only)
 */
router.get('/records', auth, adminAuth, async (req, res) => {
  try {
    const { userId, startDate, endDate } = req.query;

    const query = {};
    if (userId) query.user = userId;
    if (startDate || endDate) {
      query.calculatedAt = {};
      if (startDate) query.calculatedAt.$gte = new Date(startDate);
      if (endDate) query.calculatedAt.$lte = new Date(endDate);
    }

    const records = await NewSalaryRecord.find(query)
      .sort({ calculatedAt: -1 })
      .populate('user', 'name email employeeId')
      .populate('calculatedBy', 'name email')
      .select('-__v');

    res.json({
      success: true,
      data: records
    });
  } catch (error) {
    console.error('Error fetching salary records:', error);
    res.status(500).json({ error: 'Failed to fetch salary records' });
  }
});

/**
 * DELETE /api/new-salary/records/:recordId
 * Delete a salary record (Admin only)
 */
router.delete('/records/:recordId', auth, adminAuth, async (req, res) => {
  try {
    const { recordId } = req.params;

    const record = await NewSalaryRecord.findByIdAndDelete(recordId);

    if (!record) {
      return res.status(404).json({ error: 'Salary record not found' });
    }

    res.json({
      success: true,
      message: 'Salary record deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting salary record:', error);
    res.status(500).json({ error: 'Failed to delete salary record' });
  }
});

/**
 * ============================================
 * SPAM USERS MANAGEMENT SECTION
 * ============================================
 */

/**
 * GET /api/new-salary/spam-users
 * Get all users with auto-ended attendance records (spam detection)
 * Query params: fromDate, toDate (optional)
 * Admin only
 */
router.get('/spam-users', auth, adminAuth, async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;

    // Parse date range (optional)
    let startDate, endDate;
    
    if (fromDate) {
      const dateParts = fromDate.split('-');
      if (dateParts.length === 3) {
        startDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
        startDate.setHours(0, 0, 0, 0);
      } else {
        startDate = new Date(fromDate);
        startDate.setHours(0, 0, 0, 0);
      }
    }
    
    if (toDate) {
      const dateParts = toDate.split('-');
      if (dateParts.length === 3) {
        endDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
        endDate.setHours(23, 59, 59, 999);
      } else {
        endDate = new Date(toDate);
        endDate.setHours(23, 59, 59, 999);
      }
    }

    // Build query for auto-ended records
    const query = {
      autoEnded: true,
      isPresent: true,
      isLeave: false
    };

    // Add date filter if provided
    if (startDate && endDate) {
      query.date = {
        $gte: startDate,
        $lte: endDate
      };
    }

    // Fetch auto-ended attendance records
    const spamRecords = await DailyAttendance.find(query)
      .populate('user', 'name email employeeId department')
      .populate('markedAsSpamBy', 'name email')
      .populate('validatedBy', 'name email')
      .select('user date totalHoursWorked autoEnded spamStatus spamReason markedAsSpamBy markedAsSpamAt validatedBy validatedAt startDayTime endDayTime systemNotes')
      .sort({ date: -1 })
      .lean();

    console.log(`Found ${spamRecords.length} auto-ended attendance records`);

    // Group by user
    const userSpamMap = new Map();

    spamRecords.forEach(record => {
      if (!record.user) return;
      
      const userId = record.user._id.toString();
      
      if (!userSpamMap.has(userId)) {
        userSpamMap.set(userId, {
          userId: record.user._id,
          userName: record.user.name,
          userEmail: record.user.email,
          employeeId: record.user.employeeId,
          department: record.user.department?.name || 'No Department',
          records: [],
          totalSpamHours: 0,
          totalSpamDays: 0,
          pendingReview: 0,
          validated: 0,
          markedAsSpam: 0
        });
      }

      const userData = userSpamMap.get(userId);
      userData.records.push({
        _id: record._id,
        date: record.date,
        totalHoursWorked: record.totalHoursWorked || 0,
        startDayTime: record.startDayTime,
        endDayTime: record.endDayTime,
        spamStatus: record.spamStatus || 'Pending Review',
        spamReason: record.spamReason || 'Auto-ended by system',
        systemNotes: record.systemNotes,
        markedAsSpamBy: record.markedAsSpamBy,
        markedAsSpamAt: record.markedAsSpamAt,
        validatedBy: record.validatedBy,
        validatedAt: record.validatedAt
      });

      userData.totalSpamHours += record.totalHoursWorked || 0;
      userData.totalSpamDays += 1;

      // Count by status
      const status = record.spamStatus || 'Pending Review';
      if (status === 'Pending Review') userData.pendingReview += 1;
      else if (status === 'Valid') userData.validated += 1;
      else if (status === 'Spam') userData.markedAsSpam += 1;
    });

    // Convert to array and sort by total spam hours (descending)
    const spamUsers = Array.from(userSpamMap.values())
      .map(user => ({
        ...user,
        totalSpamHours: Math.round(user.totalSpamHours * 100) / 100
      }))
      .sort((a, b) => b.totalSpamHours - a.totalSpamHours);

    res.json({
      success: true,
      data: {
        spamUsers,
        totalSpamUsers: spamUsers.length,
        totalSpamRecords: spamRecords.length,
        dateRange: startDate && endDate ? {
          from: startDate.toISOString(),
          to: endDate.toISOString()
        } : null
      }
    });
  } catch (error) {
    console.error('Error fetching spam users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch spam users data',
      details: error.message
    });
  }
});

/**
 * POST /api/new-salary/spam-users/validate
 * Mark an auto-ended attendance record as valid (include in salary)
 * Body: { recordId, action: 'validate' | 'spam', reason? }
 * Admin only
 */
router.post('/spam-users/validate', auth, adminAuth, async (req, res) => {
  try {
    const { recordId, action, reason } = req.body;

    if (!recordId || !action) {
      return res.status(400).json({
        success: false,
        error: 'recordId and action are required'
      });
    }

    if (!['validate', 'spam'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'action must be either "validate" or "spam"'
      });
    }

    // Find the attendance record
    const record = await DailyAttendance.findById(recordId)
      .populate('user', 'name email');

    if (!record) {
      return res.status(404).json({
        success: false,
        error: 'Attendance record not found'
      });
    }

    if (!record.autoEnded) {
      return res.status(400).json({
        success: false,
        error: 'This record is not auto-ended'
      });
    }

    // Update record based on action
    if (action === 'validate') {
      record.spamStatus = 'Valid';
      record.validatedBy = req.user.id;
      record.validatedAt = new Date();
      record.spamReason = reason || 'Validated by admin';
    } else if (action === 'spam') {
      record.spamStatus = 'Spam';
      record.markedAsSpamBy = req.user.id;
      record.markedAsSpamAt = new Date();
      record.spamReason = reason || 'Marked as spam by admin';
    }

    // Save the record
    try {
      await record.save();
      console.log(`Successfully updated record ${recordId} with spamStatus: ${record.spamStatus}`);
    } catch (saveError) {
      console.error('Error saving record:', saveError);
      throw new Error(`Failed to save record: ${saveError.message}`);
    }

    // Create alert/notification for spam detection
    if (action === 'spam') {
      try {
        const Notification = require('../models/Notification');
        
        // Notify Admin and Manager
        const admins = await User.find({ role: { $in: ['Admin', 'Manager'] } })
          .select('_id');

        if (admins && admins.length > 0) {
          const notifications = admins.map(admin => ({
            recipient: admin._id, // Use 'recipient' instead of 'user'
            type: 'procurement_alert', // Use existing enum value
            title: 'Auto-Ended Attendance Marked as Spam',
            message: `User ${record.user?.name || 'Unknown'} has an auto-ended attendance record marked as spam on ${new Date(record.date).toLocaleDateString()}. Hours: ${record.totalHoursWorked || 0}h`,
            read: false
          }));

          await Notification.insertMany(notifications);
          console.log(`Created ${notifications.length} spam detection notifications`);
        }
      } catch (notifError) {
        // Don't fail the request if notification creation fails
        console.error('Error creating notifications (non-critical):', notifError);
      }
    }

    res.json({
      success: true,
      message: `Attendance record ${action === 'validate' ? 'validated' : 'marked as spam'} successfully`,
      data: {
        record: {
          _id: record._id,
          userId: record.user._id,
          userName: record.user.name,
          date: record.date,
          spamStatus: record.spamStatus,
          spamReason: record.spamReason
        }
      }
    });
  } catch (error) {
    console.error('Error validating spam record:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Failed to validate spam record',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * POST /api/new-salary/spam-users/bulk-validate
 * Bulk validate or mark multiple records
 * Body: { recordIds: [], action: 'validate' | 'spam', reason? }
 * Admin only
 */
router.post('/spam-users/bulk-validate', auth, adminAuth, async (req, res) => {
  try {
    const { recordIds, action, reason } = req.body;

    if (!recordIds || !Array.isArray(recordIds) || recordIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'recordIds array is required'
      });
    }

    if (!['validate', 'spam'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'action must be either "validate" or "spam"'
      });
    }

    // Update all records
    const updateData = action === 'validate' ? {
      spamStatus: 'Valid',
      validatedBy: req.user.id,
      validatedAt: new Date(),
      spamReason: reason || 'Bulk validated by admin'
    } : {
      spamStatus: 'Spam',
      markedAsSpamBy: req.user.id,
      markedAsSpamAt: new Date(),
      spamReason: reason || 'Bulk marked as spam by admin'
    };

    const result = await DailyAttendance.updateMany(
      {
        _id: { $in: recordIds },
        autoEnded: true
      },
      updateData
    );

    // Create notifications for spam records
    if (action === 'spam' && result.modifiedCount > 0) {
      try {
        const Notification = require('../models/Notification');
        const admins = await User.find({ role: { $in: ['Admin', 'Manager'] } })
          .select('_id');

        if (admins && admins.length > 0) {
          const notifications = admins.map(admin => ({
            recipient: admin._id, // Use 'recipient' instead of 'user'
            type: 'procurement_alert', // Use existing enum value
            title: 'Bulk Spam Detection',
            message: `${result.modifiedCount} auto-ended attendance records marked as spam`,
            read: false
          }));

          if (notifications.length > 0) {
            await Notification.insertMany(notifications);
            console.log(`Created ${notifications.length} bulk spam detection notifications`);
          }
        }
      } catch (notifError) {
        // Don't fail the request if notification creation fails
        console.error('Error creating bulk notifications (non-critical):', notifError);
      }
    }

    res.json({
      success: true,
      message: `${result.modifiedCount} records ${action === 'validate' ? 'validated' : 'marked as spam'} successfully`,
      data: {
        modifiedCount: result.modifiedCount
      }
    });
  } catch (error) {
    console.error('Error bulk validating spam records:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk validate spam records',
      details: error.message
    });
  }
});

module.exports = router;

