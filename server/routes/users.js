const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const User = require('../models/User');
const Issue = require('../models/Issue');
const { auth } = require('../middleware/auth');

// Multer storage for profile pictures
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPG, PNG, WEBP) are allowed'));
    }
  }
});

// GET /api/users/me - Get full current user profile
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ user });
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/users/me - Update personal information
router.post('/me/update', auth, async (req, res) => {
  try {
    const { name, phone, address, city, state, postalCode, country } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Full name is required' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.name = name.trim();
    if (phone !== undefined) user.phone = phone.trim();
    if (address !== undefined) user.address = address.trim();
    if (city !== undefined) user.city = city.trim();
    if (state !== undefined) user.state = state.trim();
    if (postalCode !== undefined) user.postalCode = postalCode.trim();
    if (country !== undefined) user.country = country.trim();

    await user.save();

    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({ message: 'Profile updated successfully', user: userResponse });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Also support PATCH /api/users/me
router.patch('/me', auth, async (req, res) => {
  try {
    const { name, phone, address, city, state, postalCode, country } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Full name is required' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.name = name.trim();
    if (phone !== undefined) user.phone = phone.trim();
    if (address !== undefined) user.address = address.trim();
    if (city !== undefined) user.city = city.trim();
    if (state !== undefined) user.state = state.trim();
    if (postalCode !== undefined) user.postalCode = postalCode.trim();
    if (country !== undefined) user.country = country.trim();

    await user.save();

    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({ message: 'Profile updated successfully', user: userResponse });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/users/me/profile-photo - Upload profile picture
router.post('/me/profile-photo', auth, upload.single('photo'), async (req, res) => {
  try {
    let avatarUrl = '';
    
    if (req.file) {
      avatarUrl = `/uploads/${req.file.filename}`;
    } else if (req.body.photoData) {
      // Support base64 or direct URL
      avatarUrl = req.body.photoData;
    } else {
      return res.status(400).json({ message: 'No photo provided' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.avatar = avatarUrl;
    await user.save();

    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({ message: 'Profile photo uploaded successfully', user: userResponse });
  } catch (err) {
    console.error('Profile photo error:', err);
    res.status(500).json({ message: err.message || 'Failed to upload photo' });
  }
});

// DELETE /api/users/me/profile-photo - Remove profile picture
router.delete('/me/profile-photo', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.avatar = '';
    await user.save();

    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({ message: 'Profile photo removed successfully', user: userResponse });
  } catch (err) {
    console.error('Remove photo error:', err);
    res.status(500).json({ message: 'Failed to remove photo' });
  }
});

// GET /api/users/me/statistics - Dynamic real issue stats from MongoDB
router.get('/me/statistics', auth, async (req, res) => {
  try {
    const userId = req.user._id;

    // Count user's submitted issues by status category
    const userIssues = await Issue.find({ createdBy: userId });

    const reportedCount = userIssues.length;
    let resolvedCount = 0;
    let inProgressCount = 0;
    let underReviewCount = 0;

    userIssues.forEach(issue => {
      const st = (issue.status || '').toLowerCase();
      if (st === 'resolved' || st === 'closed') {
        resolvedCount++;
      } else if (st === 'in_progress' || st === 'assigned' || st === 'verified') {
        inProgressCount++;
      } else if (st === 'reported' || st === 'open' || st === 'under_review') {
        underReviewCount++;
      }
    });

    const resolvedPercent = reportedCount > 0 ? Math.round((resolvedCount / reportedCount) * 100) : null;
    const inProgressPercent = reportedCount > 0 ? Math.round((inProgressCount / reportedCount) * 100) : null;
    const underReviewPercent = reportedCount > 0 ? Math.round((underReviewCount / reportedCount) * 100) : null;

    res.json({
      statistics: {
        reported: reportedCount,
        resolved: resolvedCount,
        inProgress: inProgressCount,
        underReview: underReviewCount,
        resolvedPercent: resolvedPercent !== null ? `${resolvedPercent}% resolved` : '—',
        inProgressPercent: inProgressPercent !== null ? `${inProgressPercent}% in progress` : '—',
        underReviewPercent: underReviewPercent !== null ? `${underReviewPercent}% under review` : '—'
      }
    });
  } catch (err) {
    console.error('User statistics error:', err);
    res.status(500).json({ message: 'Failed to load user statistics' });
  }
});

// POST /api/users/me/change-password - Change user password
router.post('/me/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmNewPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long' });
    }

    if (confirmNewPassword && newPassword !== confirmNewPassword) {
      return res.status(400).json({ message: 'New password and confirmation do not match' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/users/me/deactivate - Deactivate user account
router.patch('/me/deactivate', auth, async (req, res) => {
  try {
    const { password } = req.body;
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (password) {
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Incorrect password confirmation' });
      }
    }

    user.status = 'deactivated';
    await user.save();

    res.json({ message: 'Account deactivated successfully' });
  } catch (err) {
    console.error('Deactivate account error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET & PATCH /api/users/me/notification-preferences
router.get('/me/notification-preferences', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({ notificationPreferences: user.notificationPreferences });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/me/notification-preferences', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.notificationPreferences = { ...user.notificationPreferences, ...req.body };
    await user.save();
    res.json({ message: 'Notification preferences updated', notificationPreferences: user.notificationPreferences });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET & PATCH /api/users/me/account-settings
router.get('/me/account-settings', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({ accountSettings: user.accountSettings });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/me/account-settings', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.accountSettings = { ...user.accountSettings, ...req.body };
    await user.save();
    res.json({ message: 'Account settings updated', accountSettings: user.accountSettings });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET & PATCH /api/users/me/privacy-settings
router.get('/me/privacy-settings', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({ privacySettings: user.privacySettings });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/me/privacy-settings', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.privacySettings = { ...user.privacySettings, ...req.body };
    await user.save();
    res.json({ message: 'Privacy settings updated', privacySettings: user.privacySettings });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
