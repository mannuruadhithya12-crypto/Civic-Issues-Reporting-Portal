const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
    const authHeader = req.header('Authorization');
    const token = authHeader?.startsWith('Bearer ')
        ? authHeader.slice(7).trim()
        : authHeader || req.query.token;

    // Demo mode cannot be enabled by an untrusted header or query param unless explicitly enabled in environment
    const isDemoEnabled = process.env.ENABLE_DEMO_MODE === 'true';
    const modeHeader = req.headers['x-demo-mode'] || req.query.dataMode || req.query.demo;
    req.isDemo = isDemoEnabled && (modeHeader === 'demo' || modeHeader === 'true');

    // Demo authentication bypass is strictly disabled unless explicitly permitted in isolated environments
    const allowDemoAuth = isDemoEnabled && process.env.ALLOW_DEMO_AUTH === 'true';

    if (!token) {
        if (req.isDemo && allowDemoAuth) {
            req.user = {
                _id: 'demo-admin-id',
                id: 'demo-admin-id',
                role: 'admin',
                name: 'Demo Admin',
                email: 'admin@civicconnect.demo'
            };
            return next();
        }
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');

        let user = null;
        const userId = decoded.id || decoded._id;

        if (userId) {
            user = await User.findById(userId).select('-password');
        } else if (decoded.email) {
            user = await User.findOne({ email: decoded.email.toLowerCase() }).select('-password');
        }

        if (!user) {
            return res.status(401).json({ message: 'Token is valid, but user not found' });
        }

        if (user.status && user.status !== 'active') {
            return res.status(403).json({ message: `Account is ${user.status}` });
        }

        req.user = user;
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Token is not valid' });
    }
};

const admin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Authorization denied, authentication required' });
    }

    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin authorization denied' });
    }

    next();
};

module.exports = { auth, admin };

