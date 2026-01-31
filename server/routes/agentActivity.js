const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// Activity data model (simple in-memory storage for now)
// In production, you should create a proper MongoDB model
const activityLogs = [];

/**
 * POST /api/agent/activity/ingest
 * Receive activity data from desktop agent
 */
router.post('/activity/ingest', auth, async (req, res) => {
  try {
    const {
      attendanceId,
      timestamp,
      mouseEvents,
      keyboardEvents,
      idleSeconds,
      activeApp,
      intervalDuration
    } = req.body;

    // Validate required fields
    if (!attendanceId) {
      return res.status(400).json({
        success: false,
        error: 'Attendance ID is required'
      });
    }

    // Create activity log entry
    const activityLog = {
      userId: req.user.id,
      attendanceId,
      timestamp: timestamp || new Date(),
      mouseEvents: mouseEvents || 0,
      keyboardEvents: keyboardEvents || 0,
      idleSeconds: idleSeconds || 0,
      activeApp: activeApp || 'Unknown',
      intervalDuration: intervalDuration || 30,
      createdAt: new Date()
    };

    // Store in memory (in production, save to database)
    activityLogs.push(activityLog);

    // Keep only last 1000 entries to prevent memory issues
    if (activityLogs.length > 1000) {
      activityLogs.shift();
    }

    console.log(`📊 Activity data received from user ${req.user.email}:`, {
      mouseEvents,
      keyboardEvents,
      idleSeconds,
      activeApp
    });

    res.json({
      success: true,
      message: 'Activity data ingested successfully'
    });

  } catch (error) {
    console.error('Activity ingestion error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to ingest activity data'
    });
  }
});

/**
 * GET /api/agent/activity/summary/:userId
 * Get activity summary for a user
 */
router.get('/activity/summary/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;

    // Verify authorization
    if (req.user.id !== userId && req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Filter logs for this user
    const userLogs = activityLogs.filter(log => log.userId === userId);

    // Calculate summary
    const summary = {
      totalLogs: userLogs.length,
      totalMouseEvents: userLogs.reduce((sum, log) => sum + log.mouseEvents, 0),
      totalKeyboardEvents: userLogs.reduce((sum, log) => sum + log.keyboardEvents, 0),
      totalIdleSeconds: userLogs.reduce((sum, log) => sum + log.idleSeconds, 0),
      recentLogs: userLogs.slice(-10) // Last 10 entries
    };

    res.json({ success: true, summary });

  } catch (error) {
    console.error('Activity summary error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
