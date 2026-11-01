// server/index.js
require("dotenv").config();
const { validateEnv } = require("./config/validateEnv");
validateEnv();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const NodeGeocoder = require("node-geocoder");

const interventionsRoutes = require('./routes/interventions');

const User = require("./models/User");
const Issue = require("./models/Issue");
const { auth, admin } = require("./middleware/auth");

const fs = require('fs');

const app = express();

// Secure CORS configuration
const rawOrigins = process.env.CORS_ORIGIN || 'http://localhost:3000,http://127.0.0.1:3000';
const allowedOrigins = rawOrigins.split(',').map(o => o.trim()).filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g., server-to-server, health probes, curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`Origin '${origin}' not permitted by CORS policy`));
  },
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Global logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Configure persistent uploads directory
const uploadDir = process.env.UPLOAD_DIR 
  ? path.resolve(process.env.UPLOAD_DIR) 
  : path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Serve static files from uploads directory
app.use('/uploads', express.static(uploadDir));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Configure geocoder
const geocoder = NodeGeocoder({
  provider: 'openstreetmap'
});

const PORT = process.env.PORT || 5000;

const { MongoMemoryServer } = require('mongodb-memory-server');
let mongoServer;

// Connect to MongoDB with retry logic
const connectDB = async () => {
  if (mongoose.connection.readyState === 1) return;
  try {
    let mongoUri = process.env.MONGO_URI;
    
    // Try primary MONGO_URI first, fallback to Memory Server if network/whitelist fails
    try {
      if (mongoUri && !process.env.FORCE_MEMORY_DB) {
        await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 2000 });
        console.log("MongoDB connected directly to primary URI");
      } else {
        throw new Error("Using Memory Server");
      }
    } catch (primaryErr) {
      console.log("Primary MongoDB connection skipped or failed (" + primaryErr.message + "). Starting Memory Server...");
      try { await mongoose.disconnect(); } catch (e) {}

      if (!mongoServer) {
        const fs = require('fs');
        const dbPath = path.join(__dirname, 'data', 'temp_mongo_db');
        if (!fs.existsSync(dbPath)) fs.mkdirSync(dbPath, { recursive: true });
        
        try {
          mongoServer = await MongoMemoryServer.create({
            instance: {
              port: 27018,
              dbPath: dbPath,
              dbName: 'mernDB'
            }
          });
          mongoUri = mongoServer.getUri();
        } catch (memErr) {
          try {
            mongoServer = await MongoMemoryServer.create({
              instance: { dbName: 'mernDB' }
            });
            mongoUri = mongoServer.getUri();
          } catch (e) {
            mongoUri = 'mongodb://127.0.0.1:27018/mernDB';
          }
        }
      } else {
        try {
          mongoUri = mongoServer.getUri();
        } catch (e) {
          mongoServer = null;
          return connectDB();
        }
      }

      await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
      console.log("MongoDB connected via Memory Server at " + mongoUri);
    }

    // Ensure default data and admin/worker exist for local use
    try {
      const seedDatabase = require('./seedDatabase');
      await seedDatabase();
    } catch (seedErr) {
      console.error("Seeding notice:", seedErr.message);
    }
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    if (mongoServer) {
      try { await mongoServer.stop({ doCleanup: true }); } catch (e) {}
      mongoServer = null;
    }
    console.log("Retrying in 3 seconds...");
    setTimeout(connectDB, 3000);
  }
};

// Database auto-reconnect middleware
app.use(async (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    console.log(`[DB Auto-Reconnect] Mongoose connection state is ${mongoose.connection.readyState}. Reconnecting...`);
    try {
      await connectDB();
    } catch (err) {
      console.error("[DB Auto-Reconnect Failed]:", err.message);
    }
  }
  next();
});

connectDB();

// Health check endpoints
app.get("/", (req, res) => {
  res.json({ message: "Civic Issues API running!" });
});

app.get("/api/health", (req, res) => {
  const dbStatusMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  const dbReadyState = mongoose.connection.readyState;
  const isDbHealthy = dbReadyState === 1;

  // Sanitized health check: operational status without exposing internal cluster topology or memory layout
  const health = {
    status: isDbHealthy ? 'UP' : 'DEGRADED',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    database: {
      status: dbStatusMap[dbReadyState] || 'unknown',
      readyState: dbReadyState
    },
    version: '1.0.0'
  };

  res.status(isDbHealthy ? 200 : 503).json(health);
});

// --- Auth Routes ---
const authRoutes = require("./routes/auth");
app.use("/api/auth", authRoutes);

// --- User Routes ---
const userRoutes = require("./routes/users");
app.use("/api/users", userRoutes);


// --- AI Routes ---
const aiRoutes = require("./routes/ai");
app.use("/api/ai", aiRoutes);

// --- Issue Routes ---
const issueRoutes = require("./routes/issues");
app.use("/api/issues", issueRoutes);

// --- Subsystem Backend Routes (Admin Core) ---
app.use("/api/admin/intelligence", require("./routes/intelligence"));
app.use("/api/admin/interventions", interventionsRoutes);
app.use("/api/admin/rl", require("./routes/reinforcementLearning"));
app.use("/api/admin/adaptive", require("./routes/adaptiveRoutes"));
app.use("/api/admin/operations", require("./routes/operations"));
app.use("/api/admin/dashboard", require("./routes/dashboard"));

// --- Admin Routes ---
const adminRoutes = require("./routes/admin");
app.use("/api/admin", adminRoutes);

// --- Dataset Import Routes ---
const datasetImportRoutes = require("./routes/datasetImport");
app.use("/api/dataset-import", datasetImportRoutes);

// --- Worker Routes ---
const workerRoutes = require("./routes/workers");
app.use("/api/worker", workerRoutes);

// --- Notification Routes ---
const notificationRoutes = require("./routes/notifications");
app.use("/api/notifications", notificationRoutes);

// --- Announcement Routes ---
const announcementRoutes = require("./routes/announcements");
app.use("/api/announcements", announcementRoutes);

// --- Support Routes ---
const supportRoutes = require("./routes/support");
app.use("/api/support", supportRoutes);

// --- Location Routes (Centralized throttled Nominatim proxy) ---
const locationRoutes = require("./routes/location");
app.use("/api/location", locationRoutes);

// Bulk update status (Admin only)
app.put("/api/issues/bulk-update", auth, admin, async (req, res) => {
  const { ids, status } = req.body;
  try {
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "Invalid issue IDs" });
    }

    const result = await Issue.updateMany(
      { _id: { $in: ids } },
      {
        $set: { status },
        $push: {
          timeline: {
            at: new Date(),
            who: req.user.email || req.user.username,
            text: `Bulk status update to ${status}`,
            status: status
          }
        }
      }
    );

    res.json({ message: `Updated ${result.modifiedCount} issues`, count: result.modifiedCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Export issues as CSV (Admin only)
app.get("/api/issues/export", auth, admin, async (req, res) => {
  try {
    const issues = await Issue.find().populate("createdBy", "username email");

    const csvHeader = "ID,Title,Description,Department,Status,Priority,Location,Assigned To,Created By,Created At\n";
    const csvRows = issues.map(issue => {
      const row = [
        issue._id,
        `"${(issue.title || '').replace(/"/g, '""')}"`,
        `"${(issue.description || '').replace(/"/g, '""')}"`,
        issue.department || 'Other',
        issue.status || 'open',
        issue.priority || 'normal',
        `"${(issue.locationName || issue.location || '').replace(/"/g, '""')}"`,
        issue.assignedTo || 'Unassigned',
        issue.createdBy ? (issue.createdBy.username || issue.createdBy.email) : 'Unknown',
        new Date(issue.createdAt).toISOString()
      ];
      return row.join(',');
    });

    const csv = csvHeader + csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=issues-${Date.now()}.csv`);
    res.send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get departments list
app.get("/api/departments", (req, res) => {
  const { DEPARTMENTS } = require('./config/departments');
  res.json(DEPARTMENTS);
});

// Get staff list (Admin only)
app.get("/api/staff", auth, admin, (req, res) => {
  const staff = [
    "worker_1",
    "worker_2",
    "supervisor_a",
    "supervisor_b",
    "technician_1",
    "technician_2"
  ];
  res.json(staff);
});

// --- Legacy Alias Routes ---
const analyticsRoutes = require("./routes/analytics");
app.use("/api/analytics", analyticsRoutes);

const decisionSupportRoutes = require("./routes/decisionSupport");
app.use("/api/decision-support", decisionSupportRoutes);

const predictionsRoutes = require('./routes/predictions');
app.use("/api/predictions", predictionsRoutes);

app.use("/api/interventions", interventionsRoutes);

const reinforcementLearningRoutes = require('./routes/reinforcementLearning');
app.use("/api/reinforcement-learning", reinforcementLearningRoutes);

const adaptiveRoutes = require('./routes/adaptiveRoutes');
app.use("/api/adaptive-intelligence", adaptiveRoutes);


// SPA client fallback for production deployments
const clientBuildPath = path.join(__dirname, '..', 'client', 'build');
if (fs.existsSync(clientBuildPath)) {
  app.use(express.static(clientBuildPath));
  app.get('*', (req, res, next) => {
    if (req.url.startsWith('/api') || req.url.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File too large. Max size is 5MB.' });
    }
    return res.status(400).json({ message: err.message });
  }
  res.status(500).json({ message: err.message || 'Server error' });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

