// server/services/duplicateService.js
'use strict';

const duplicateEngine = require('./duplicateMatchingEngine');

/**
 * Legacy interface for duplicate checks (backward compatibility).
 * Wraps findDuplicateCandidates with legacy signature.
 */
const checkDuplicates = async (latitude, longitude, category, radiusInMeters = 300) => {
    try {
        const result = await duplicateEngine.findDuplicateCandidates({
            latitude,
            longitude,
            category,
            department: category,
            radiusMeters: radiusInMeters
        });
        return result.candidates || [];
    } catch (err) {
        console.error('Error in duplicateService.checkDuplicates:', err);
        return [];
    }
};

/**
 * Full hybrid duplicate candidate detection.
 */
const findDuplicates = async (options) => {
    return duplicateEngine.findDuplicateCandidates(options);
};

module.exports = {
    checkDuplicates,
    findDuplicates,
    duplicateEngine
};
