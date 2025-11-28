// const express = require("express")
// const router = express.Router()
// const auth = require("../middleware/auth")
// const adminAuth = require("../middleware/adminAuth")
// const Task = require("../models/Task")
// const User = require("../models/User")
// const Department = require("../models/Department")
// const Progress = require("../models/Progress")
// const {
//   sendTaskReminder,
//   generateDepartmentProgressPDF,
//   sendDepartmentProgressReport,
//   sendAimReminder,
// } = require("../utils/emailService")

// // @route   POST api/notifications/broadcast-reminders
// // @desc    Broadcast progress update reminders to all users with active tasks
// // @access  Private (Admin only)
// router.post("/broadcast-reminders", async (req, res) => {
//   try {
//     // Get all active tasks (not completed)
//     const tasks = await Task.find({ status: { $ne: "Completed" } })
//       .populate("assignee", "name email")
//       .populate("department", "name")

//     if (tasks.length === 0) {
//       return res.status(404).json({ msg: "No active tasks found" })
//     }

//     const emailPromises = []
//     const emailsSent = []

//     // Send email for each task
//     for (const task of tasks) {
//       if (!task.assignee) continue

//       emailPromises.push(
//         sendTaskReminder(task.assignee, task)
//           .then(() => {
//             emailsSent.push({
//               user: task.assignee.name,
//               email: task.assignee.email,
//               task: task.title,
//             })
//           })
//           .catch((error) => {
//             console.error(`Failed to send email to ${task.assignee.email}:`, error)
//           }),
//       )
//     }

//     await Promise.all(emailPromises)

//     res.json({
//       msg: `Sent ${emailsSent.length} reminder emails`,
//       emails: emailsSent,
//     })
//   } catch (err) {
//     console.error(err.message)
//     res.status(500).send("Server Error")
//   }
// })

// // @route   POST api/notifications/broadcast-aim-reminders
// // @desc    Broadcast aim setting reminders to all users
// // @access  Private (Admin only)
// router.post("/broadcast-aim-reminders", async (req, res) => {
//   try {
//     // Get all active users
//     const users = await User.find({ role: { $ne: "Admin" } })
//       .populate("department", "name")

//     if (users.length === 0) {
//       return res.status(404).json({ msg: "No users found" })
//     }

//     const emailPromises = []
//     const emailsSent = []

//     // Send email for each user
//     for (const user of users) {
//       emailPromises.push(
//         sendAimReminder(user)
//           .then(() => {
//             emailsSent.push({
//               user: user.name,
//               email: user.email,
//             })
//           })
//           .catch((error) => {
//             console.error(`Failed to send email to ${user.email}:`, error)
//           }),
//       )
//     }

//     await Promise.all(emailPromises)

//     res.json({
//       msg: `Sent ${emailsSent.length} aim reminder emails`,
//       emails: emailsSent,
//     })
//   } catch (err) {
//     console.error(err.message)
//     res.status(500).send("Server Error")
//   }
// })

// // @route   POST api/notifications/generate-reports/:id
// // @desc    Generate and email department progress reports
// // @access  Private (Admin only)
// router.post("/generate-reports/:id", async (req, res) => {
//   try {
//     // Get all departments
//     const departments = await Department.find()
//     if (departments.length === 0) {
//       return res.status(404).json({ msg: "No departments found" })
//     }

//     const reportsSent = []

//     // Generate and send report for each department
//     for (const department of departments) {
//       // Get all tasks for this department
//       const tasks = await Task.find({ department: department._id })

//       // Get all users in this department
//       const users = await User.find({ department: department._id })

//       // Get progress data for all users in this department
//       const progressData = {}

//       // Fetch progress data for each user
//       for (const user of users) {
//         const userProgress = await Progress.find({ user: user._id }).sort({ date: -1 }).limit(30) // Get last 30 progress entries per user

//         progressData[user._id] = userProgress
//       }

//       // Generate PDF report with progress data
//       const pdfPath = await generateDepartmentProgressPDF(department, tasks, users, progressData)

//       const admin = await User.findById(req.params.id);
//       if (!admin || !admin.email) {
//         return res.status(404).json({ msg: "Admin user not found or missing email" });
//       }
//       await sendDepartmentProgressReport(admin, department, pdfPath);

//       reportsSent.push({
//         department: department.name,
//         taskCount: tasks.length,
//         userCount: users.length,
//         progressEntriesAnalyzed: Object.values(progressData).reduce((sum, entries) => sum + entries.length, 0),
//       })
//     }

//     res.json({
//       msg: `Generated and sent ${reportsSent.length} department reports`,
//       reports: reportsSent,
//     })
//   } catch (err) {
//     console.error(err.message)
//     res.status(500).send("Server Error")
//   }
// })

// // @route   POST api/notifications/toggle-automation
// // @desc    Toggle automation settings for reminders
// // @access  Private (Admin only)
// router.post("/toggle-automation", async (req, res) => {
//   try {
//     const { automateAimReminders, automateProgressReminders } = req.body;
    
//     // In a real implementation, you would save these settings to a database
//     // For now, we'll just return success
    
//     res.json({
//       msg: "Automation settings updated",
//       settings: {
//         automateAimReminders,
//         automateProgressReminders
//       }
//     });
//   } catch (err) {
//     console.error(err.message);
//     res.status(500).send("Server Error");
//   }
// });

// module.exports = router


const express = require("express")
const router = express.Router()
const nodemailer = require("nodemailer")
const Task = require("../models/Task")
const User = require("../models/User")
const Aim = require("../models/Aim")
const MonitoringAlert = require("../models/MonitoringAlert")
const { sendPushNotificationToUsers, broadcastPushNotification } = require("../utils/pushNotificationService")

// Nodemailer transporter setup (replace with your email service details)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
})

// Route to broadcast task reminders with monitoring alerts
router.post("/broadcast-reminders", async (req, res) => {
  try {
    // Find tasks due today or overdue
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tasks = await Task.find({
      dueDate: { $lte: today },
      status: { $ne: "completed" },
    }).populate("assignee", "email name _id")

    if (!tasks || tasks.length === 0) {
      return res.status(200).send({ message: "No tasks due today or overdue.", emails: [] })
    }

    // Get io instance from request
    const io = req.io

    // Create monitoring alerts for each user with incomplete tasks
    const alertPromises = []
    const userAlerts = new Map() // Track alerts per user

    for (const task of tasks) {
      if (task.assignee && task.assignee._id) {
        const userId = task.assignee._id.toString()
        
        // Group tasks by user
        if (!userAlerts.has(userId)) {
          userAlerts.set(userId, {
            user: task.assignee,
            tasks: []
          })
        }
        userAlerts.get(userId).tasks.push(task)
      }
    }

    // Create one alert per user with all their incomplete tasks
    for (const [userId, data] of userAlerts) {
      const taskCount = data.tasks.length
      const taskTitles = data.tasks.map(t => t.title).join(", ")
      
      // Create monitoring alert
      const alertPromise = MonitoringAlert.createAlert({
        employee: userId,
        alert_type: 'productivity_drop',
        severity: taskCount > 3 ? 'high' : taskCount > 1 ? 'medium' : 'low',
        title: '⚠️ Task Completion Reminder',
        description: `You have ${taskCount} incomplete task${taskCount > 1 ? 's' : ''} that need${taskCount === 1 ? 's' : ''} your attention. Please complete: ${taskTitles.substring(0, 100)}${taskTitles.length > 100 ? '...' : ''}`,
        data: {
          task_count: taskCount,
          task_ids: data.tasks.map(t => t._id)
        },
        status: 'active',
        auto_generated: true,
        notification_sent: true,
        notification_channels: ['dashboard']
      })
      
      alertPromises.push(alertPromise)

      // Emit socket event for real-time alert in header
      if (io) {
        alertPromise.then((alert) => {
          const alertData = {
            _id: alert._id,
            title: alert.title,
            description: alert.description,
            severity: alert.severity,
            alert_type: alert.alert_type,
            timestamp: alert.timestamp,
            status: alert.status,
            employee: alert.employee
          }
          
          io.to(`user_${userId}`).emit('monitoring-alert', alertData)
          console.log(`📢 Alert emitted to user ${userId}:`, alertData)
        }).catch(err => {
          console.error(`Failed to emit alert to user ${userId}:`, err)
        })
      } else {
        console.warn('⚠️ Socket.io instance not available')
      }
    }

    // Wait for all alerts to be created
    const createdAlerts = await Promise.all(alertPromises)

    // Send push notifications
    try {
      const pushResult = await broadcastPushNotification(
        "⚠️ Task Completion Reminder",
        "You have incomplete tasks that need your attention. Check your alerts!",
        "/tasks",
        "task-reminder",
      )

      console.log(`Push notifications sent: ${pushResult.successful} successful, ${pushResult.failed} failed`)
    } catch (pushError) {
      console.error("Error sending push notifications:", pushError)
    }

    res.status(200).send({ 
      message: `Task reminder alerts sent successfully to ${userAlerts.size} users.`,
      alertsCreated: createdAlerts.length,
      usersNotified: userAlerts.size,
      emails: [] // No emails sent, only alerts
    })
  } catch (error) {
    console.error("Error broadcasting task reminders:", error)
    res.status(500).send({ message: "Error broadcasting task reminders.", error: error.message })
  }
})

// Route to broadcast daily aims reminders
router.post("/broadcast-aim-reminders", async (req, res) => {
  try {
    // Fetch all users
    const users = await User.find({})

    if (!users || users.length === 0) {
      return res.status(200).send({ message: "No users found." })
    }

    // Send email reminders to each user
    for (const user of users) {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: "Daily Aims Reminder",
        text: `Hi ${user.email},\n\nThis is a reminder to set your aims for today!\n\nPlease set them in the WorkflowAI system.\n\nBest regards,\nThe WorkflowAI Team`,
      }

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error("Error sending email:", error)
        } else {
          console.log("Email sent:", info.response)
        }
      })
    }

    // Send push notifications
    try {
      const userIds = users.map((user) => user._id)
      const pushResult = await broadcastPushNotification(
        "Daily Aims Reminder",
        "Don't forget to set your aims for today!",
        "/aims",
        "aim-reminder",
      )

      console.log(
        `Aim reminder push notifications sent: ${pushResult.successful} successful, ${pushResult.failed} failed`,
      )
    } catch (pushError) {
      console.error("Error sending aim reminder push notifications:", pushError)
    }

    res.status(200).send({ message: "Daily aims reminders broadcasted successfully." })
  } catch (error) {
    console.error("Error broadcasting daily aims reminders:", error)
    res.status(500).send({ message: "Error broadcasting daily aims reminders." })
  }
})

module.exports = router
