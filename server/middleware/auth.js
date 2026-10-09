const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '') || req.query.token;

    // Set demo mode flag on request
    const modeHeader = req.headers['x-demo-mode'] || req.query.dataMode || req.query.demo;
    req.isDemo = modeHeader === 'demo' || modeHeader === 'true';

    if (!token) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');

        let user = null;
        if (decoded.id) {
            user = await User.findById(decoded.id).select('-password');
        }
        if (!user && decoded.email) {
            user = await User.findOne({ email: decoded.email.toLowerCase() }).select('-password');
        }
        if (!user && decoded.role === 'admin') {
            user = await User.findOne({ role: 'admin' }).select('-password');
        }
        if (!user && decoded.role === 'worker') {
            user = await User.findOne({ role: 'worker' }).select('-password');
        }
        if (!user && decoded.role === 'citizen') {
            user = await User.findOne({ role: 'citizen' }).select('-password');
        }

        if (!user) {
            return res.status(401).json({ message: 'Token is valid, but user not found' });
        }

        req.user = user;
        next();
    } catch (err) {
        console.error('Auth Error:', err.message);
        res.status(401).json({ message: 'Token is not valid' });
    }
};

const admin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Admin authorization denied' });
    }
};

module.exports = { auth, admin };
