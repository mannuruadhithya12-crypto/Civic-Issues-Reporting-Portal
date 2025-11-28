// server/index.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const NodeGeocoder = require("node-geocoder");

const User = require("./models/User");
const Issue = require("./models/Issue");
const { auth, admin } = require("./middleware/auth");

const app = express();
app.use(cors());
app.use(express.json());

// Global logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
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

// Connect to MongoDB with retry logic
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    console.log("Retrying in 5 seconds...");
    setTimeout(connectDB, 5000);
  }
};

connectDB();

// Health check
app.get("/", (req, res) => {
  res.json({ message: "Civic Issues API running!" });
});

// --- Auth Routes ---

// Register
app.post("/api/auth/register", async (req, res) => {
  const { username, email, password, role = 'user' } = req.body;
  try {
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: "User with this email already exists" });

    user = await User.findOne({ username });
    if (user) return res.status(400).json({ message: "Username already taken" });

    const hashedPassword = await bcrypt.hash(password, 10);
    user = new User({ username, email, password: hashedPassword, role });
    await user.save();

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: "24h",
    });

    res.status(201).json({ token, user: { id: user._id, username, email, role: user.role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Login
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: "24h",
    });

    res.json({ token, user: { id: user._id, username: user.username, email: user.email, role: user.role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// --- Issue Routes ---

// Get user's own tickets (Protected)
app.get("/api/issues/my-tickets", auth, async (req, res) => {
  try {
    const issues = await Issue.find({ createdBy: req.user.id }).sort({ createdAt: -1 });
    res.json(issues);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get all issues - sorted with urgent at top
app.get("/api/issues", async (req, res) => {
  try {
    const issues = await Issue.find().populate("createdBy", "username");

    // Sort: urgent first, then by createdAt descending
    const sortedIssues = issues.sort((a, b) => {
      // Priority order: urgent > high > normal > low
      const priorityOrder = { urgent: 4, high: 3, normal: 2, low: 1 };
      const aPriority = priorityOrder[a.priority] || 2;
      const bPriority = priorityOrder[b.priority] || 2;

      if (aPriority !== bPriority) {
        return bPriority - aPriority; // Higher priority first
      }

      // If same priority, sort by date (newest first)
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    res.json(sortedIssues);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Create issue (Protected) with file upload
app.post("/api/issues", auth, upload.array('images', 5), async (req, res) => {
  console.log('Received issue submission:', req.body);
  const { title, description, location, coordinates, department, priority } = req.body;
  try {
    let locationName = location;
    let parsedCoordinates = coordinates ? JSON.parse(coordinates) : null;

    // Reverse geocode if coordinates are provided
    if (parsedCoordinates && parsedCoordinates.latitude && parsedCoordinates.longitude) {
      try {
        const results = await geocoder.reverse({
          lat: parsedCoordinates.latitude,
          lon: parsedCoordinates.longitude
        });
        if (results && results.length > 0) {
          locationName = results[0].formattedAddress || location;
        }
      } catch (geoErr) {
        console.error('Geocoding error:', geoErr);
      }
    }

    // Calculate SLA Deadline
    let slaHours = 24 * 7; // Default 7 days (Normal)
    if (priority === 'urgent') slaHours = 24;
    else if (priority === 'high') slaHours = 24 * 3;
    else if (priority === 'low') slaHours = 24 * 14;

    const slaDeadline = new Date(Date.now() + slaHours * 60 * 60 * 1000);

    // Get uploaded file paths
    const imagePaths = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];

    const newIssue = new Issue({
      title,
      description,
      location,
      locationName,
      coordinates: parsedCoordinates,
      images: imagePaths,
      department: department || 'Other',
      priority: priority || 'normal',
      createdBy: req.user.id,
      slaDeadline,
      timeline: [{
        who: req.user.username || 'User',
        text: 'Issue reported',
        status: 'submitted'
      }]
    });
    const savedIssue = await newIssue.save();
    res.status(201).json(savedIssue);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Update issue status (Admin only)
app.put("/api/issues/:id", auth, admin, async (req, res) => {
  const { status } = req.body;
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ message: "Issue not found" });

    issue.status = status;

    // Add to timeline
    if (!issue.timeline) issue.timeline = [];
    issue.timeline.push({
      at: new Date(),
      who: req.user.email || req.user.username,
      text: `Status changed to ${status}`,
      status: status
    });

    await issue.save();
    res.json(issue);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Add comment to issue (Protected)
app.post("/api/issues/:id/comments", auth, async (req, res) => {
  const { text } = req.body;
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ message: "Issue not found" });

    const comment = {
      text,
      by: req.user.email || req.user.username,
      at: new Date()
    };

    if (!issue.comments) issue.comments = [];
    issue.comments.push(comment);

    await issue.save();
    res.json(issue);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Update issue priority (Admin only)
app.put("/api/issues/:id/priority", auth, admin, async (req, res) => {
  const { priority } = req.body;
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ message: "Issue not found" });

    issue.priority = priority;

    // Add to timeline
    if (!issue.timeline) issue.timeline = [];
    issue.timeline.push({
      at: new Date(),
      who: req.user.email || req.user.username,
      text: `Priority changed to ${priority}`
    });

    await issue.save();
    res.json(issue);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Assign issue to worker (Admin only)
app.put("/api/issues/:id/assign", auth, admin, async (req, res) => {
  const { assignedTo } = req.body;
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ message: "Issue not found" });

    issue.assignedTo = assignedTo;
    issue.status = 'assigned';

    // Add to timeline
    if (!issue.timeline) issue.timeline = [];
    issue.timeline.push({
      at: new Date(),
      who: req.user.email || req.user.username,
      text: `Assigned to ${assignedTo}`
    });

    await issue.save();
    res.json(issue);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Attach additional images to issue (Protected)
app.post("/api/issues/:id/images", auth, upload.array('images', 5), async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ message: "Issue not found" });

    const newImagePaths = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];

    if (!issue.images) issue.images = [];
    issue.images = issue.images.concat(newImagePaths);

    await issue.save();
    res.json(issue);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

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
  const departments = [
    "Potholes",
    "Garbage overflow",
    "Streetlight failures",
    "Water leakage",
    "Illegal parking",
    "Drainage issues",
    "Broken footpaths",
    "Noise pollution",
    "Sewage problems",
    "Public safety issues",
    "Other"
  ];
  res.json(departments);
});

// Get staff list (Admin only)
app.get("/api/staff", auth, admin, (req, res) => {
  // In a real application, this would fetch from a database
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

// Get notifications (recent issues)
app.get("/api/notifications", auth, async (req, res) => {
  try {
    // Get issues from last 24 hours, sorted by most recent
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const recentIssues = await Issue.find({
      createdAt: { $gte: oneDayAgo }
    })
      .populate("createdBy", "username email")
      .sort({ createdAt: -1 })
      .limit(10);

    // Format as notifications
    const notifications = recentIssues.map(issue => ({
      id: issue._id,
      type: 'new_issue',
      title: 'New Issue Reported',
      message: `${issue.title} - ${issue.department}`,
      issueId: issue._id,
      issueTitle: issue.title,
      department: issue.department,
      createdBy: issue.createdBy?.username || 'Unknown',
      createdAt: issue.createdAt,
      read: false
    }));

    res.json(notifications);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// --- Worker & Admin Routes ---

// Create Worker (Admin only)
app.post("/api/admin/create-worker", auth, admin, async (req, res) => {
  const { username, email, password } = req.body;
  try {
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    user = new User({ username, email, password: hashedPassword, role: 'worker' });
    await user.save();

    res.status(201).json({ message: "Worker created successfully", worker: { id: user._id, username, email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get all workers (Admin only)
app.get("/api/admin/workers", auth, admin, async (req, res) => {
  try {
    const workers = await User.find({ role: 'worker' }).select('-password');
    res.json(workers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get assigned issues (Worker only)
app.get("/api/worker/assigned", auth, async (req, res) => {
  try {
    // Find issues where assignedTo matches worker's username (since we stored username string)
    // Ideally we should store ID, but for now we match by username string as per previous implementation
    const issues = await Issue.find({ assignedTo: req.user.username }).sort({ createdAt: -1 });
    res.json(issues);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Resolve issue with proof (Worker only)
app.post("/api/issues/:id/resolve", auth, upload.single('proof'), async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ message: "Issue not found" });

    if (issue.assignedTo !== req.user.username) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const proofPath = req.file ? `/uploads/${req.file.filename}` : null;
    if (!proofPath) return res.status(400).json({ message: "Proof image is required" });

    issue.status = 'pending-verification';
    issue.resolutionProof = proofPath;
    issue.resolvedBy = req.user.id;

    // Add to timeline
    if (!issue.timeline) issue.timeline = [];
    issue.timeline.push({
      at: new Date(),
      who: req.user.username,
      text: 'Marked as resolved with proof',
      status: 'pending-verification'
    });

    await issue.save();
    res.json(issue);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Analytics Endpoint (Admin only)
app.get("/api/analytics", auth, admin, async (req, res) => {
  try {
    const totalIssues = await Issue.countDocuments();
    const resolvedIssues = await Issue.countDocuments({ status: 'resolved' });
    const pendingIssues = totalIssues - resolvedIssues;

    // Issues by Department
    const issuesByDept = await Issue.aggregate([
      { $group: { _id: "$department", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Issues by Status
    const issuesByStatus = await Issue.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);

    // Recent Issues (Last 7 days)
    const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentTrend = await Issue.aggregate([
      { $match: { createdAt: { $gte: last7Days } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      totalIssues,
      resolvedIssues,
      pendingIssues,
      issuesByDept,
      issuesByStatus,
      recentTrend
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

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

