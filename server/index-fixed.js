const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const socketIo = require("socket.io");
const jwt = require("jsonwebtoken");
const path = require("path");

// Create Express app
const app = express();

// Create HTTP server and initialize Socket.IO
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: ['http://localhost:5173','http://192.168.1.2:5173','https://blackhole-workflow.vercel.app',],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// CORS Configuration
const corsOptions = {
  origin: ['http://localhost:5173','http://192.168.1.2:5173','https://blackhole-workflow.vercel.app'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
};
app.use(cors(corsOptions));

// Ensure preflight (OPTIONS) requests are handled for all routes
app.options('*', cors(corsOptions));

app.use(express.json());

// Connect to MongoDB
require('dotenv').config();

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Socket.IO connection
io.on("connection", (socket) => {
  console.log("New client connected");

  socket.on("join", (rooms) => {
    if (Array.isArray(rooms)) {
      rooms.forEach((room) => socket.join(room));
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

// Make io available to routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

app.get('/api/ping', (req, res) => {
  res.json({ message: 'Pong!' });
});

// Test Linux browser detection endpoint
app.get('/api/test-browser-detection', async (req, res) => {
  try {
    const { exec } = require('child_process');
    const util = require('util');
    const execAsync = util.promisify(exec);

    console.log('🧪 Testing Linux browser detection...');

    const results = {};

    // Test if commands are installed
    try {
      await execAsync('which xdotool');
      results.xdotool = 'installed';
      console.log('✅ xdotool is installed');
    } catch (error) {
      results.xdotool = 'not installed: ' + error.message;
      console.log('❌ xdotool not installed:', error.message);
    }

    try {
      await execAsync('which wmctrl');
      results.wmctrl = 'installed';
      console.log('✅ wmctrl is installed');
    } catch (error) {
      results.wmctrl = 'not installed: ' + error.message;
      console.log('❌ wmctrl not installed:', error.message);
    }

    try {
      await execAsync('which scrot');
      results.scrot = 'installed';
      console.log('✅ scrot is installed');
    } catch (error) {
      results.scrot = 'not installed: ' + error.message;
      console.log('❌ scrot not installed:', error.message);
    }

    try {
      await execAsync('which convert');
      results.imagemagick = 'installed';
      console.log('✅ imagemagick is installed');
    } catch (error) {
      results.imagemagick = 'not installed: ' + error.message;
      console.log('❌ imagemagick not installed:', error.message);
    }

    // Test X11 environment
    try {
      const { stdout } = await execAsync('echo $DISPLAY');
      results.display = stdout.trim() || 'not set';
      console.log('🖥️ DISPLAY environment:', results.display);
    } catch (error) {
      results.display = 'error: ' + error.message;
    }

    res.json({
      success: true,
      platform: process.platform,
      commands: results,
      message: 'Linux command test completed'
    });

  } catch (error) {
    console.error('🧪 Command test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      platform: process.platform
    });
  }
});

// Serve static files from Vite build
app.use(express.static(path.join(__dirname, '../client/dist')));

// Serve frontend only for non-API routes
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

// Import routes one by one to identify the problematic one
try {
  const authRoutes = require('./routes/auth');
  app.use("/api/auth", authRoutes);
  console.log("✅ Auth routes loaded");
} catch (error) {
  console.error("❌ Error loading auth routes:", error.message);
}

try {
  const userRoutes = require("./routes/users");
  app.use("/api/users", userRoutes);
  console.log("✅ User routes loaded");
} catch (error) {
  console.error("❌ Error loading user routes:", error.message);
}

try {
  const departmentRoutes = require("./routes/departments");
  app.use("/api/departments", departmentRoutes);
  console.log("✅ Department routes loaded");
} catch (error) {
  console.error("❌ Error loading department routes:", error.message);
}

try {
  const taskRoutes = require("./routes/tasks");
  app.use("/api/tasks", taskRoutes);
  console.log("✅ Task routes loaded");
} catch (error) {
  console.error("❌ Error loading task routes:", error.message);
}

try {
  const progressRoutes = require('./routes/progress');
  app.use('/api/progress', progressRoutes);
  console.log("✅ Progress routes loaded");
} catch (error) {
  console.error("❌ Error loading progress routes:", error.message);
}

try {
  const aimRoutes = require('./routes/aims_universal');
  app.use('/api/aims', aimRoutes);
  console.log("✅ Aims routes loaded");
} catch (error) {
  console.error("❌ Error loading aims routes:", error.message);
}

try {
  const attendanceRoutes = require('./routes/attendance');
  app.use("/api/attendance", attendanceRoutes);
  console.log("✅ Attendance routes loaded");
} catch (error) {
  console.error("❌ Error loading attendance routes:", error.message);
}

try {
  const salaryRoutes = require('./routes/salary');
  app.use("/api/salary", salaryRoutes);
  console.log("✅ Salary routes loaded");
} catch (error) {
  console.error("❌ Error loading salary routes:", error.message);
}

try {
  const leaveRoutes = require('./routes/leave');
  app.use("/api/leave", leaveRoutes);
  console.log("✅ Leave routes loaded");
} catch (error) {
  console.error("❌ Error loading leave routes:", error.message);
}

try {
  const monitoringRoutes = require("./routes/monitoring");
  app.use("/api/monitoring", monitoringRoutes);
  console.log("✅ Monitoring routes loaded");
} catch (error) {
  console.error("❌ Error loading monitoring routes:", error.message);
}

// Auto-end day background job
const Attendance = require('./models/Attendance');

const autoEndDayJob = async () => {
  try {
    const AUTO_END_DAY_ENABLED = process.env.AUTO_END_DAY_ENABLED === 'true';
    const MAX_WORKING_HOURS = parseInt(process.env.MAX_WORKING_HOURS) || 8;

    if (!AUTO_END_DAY_ENABLED) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find all attendance records that started today but haven't ended
    const activeAttendance = await Attendance.find({
      date: today,
      startDayTime: { $exists: true },
      endDayTime: { $exists: false }
    }).populate('user', 'name email');

    const currentTime = new Date();

    for (const record of activeAttendance) {
      const hoursWorked = (currentTime - record.startDayTime) / (1000 * 60 * 60);

      if (hoursWorked >= MAX_WORKING_HOURS) {
        // Auto end the day
        record.endDayTime = currentTime;
        record.employeeNotes = `Auto-ended after ${MAX_WORKING_HOURS} hours of work`;
        record.autoEnded = true;

        await record.save();

        console.log(`Auto-ended day for user: ${record.user.name} after ${Math.round(hoursWorked * 100) / 100} hours`);

        // Emit socket event
        io.emit('attendance:auto-day-ended', {
          userId: record.user._id,
          userName: record.user.name,
          endTime: currentTime,
          hoursWorked: record.hoursWorked,
          reason: 'Exceeded maximum working hours'
        });
      }
    }
  } catch (error) {
    console.error('Auto end day job error:', error);
  }
};

// Run auto-end day job every 30 minutes
setInterval(autoEndDayJob, 30 * 60 * 1000);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Auto-end day job: ${process.env.AUTO_END_DAY_ENABLED === 'true' ? 'Enabled' : 'Disabled'}`);
  console.log(`Max working hours: ${process.env.MAX_WORKING_HOURS || 8} hours`);
});