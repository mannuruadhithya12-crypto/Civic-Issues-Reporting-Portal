const Issue = require('../models/Issue');

const checkDuplicates = async (latitude, longitude, category, radiusInMeters = 500) => {
  try {
    const duplicates = await Issue.find({
      department: category,
      status: { $nin: ['resolved', 'rejected'] },
      coordinates: {
        $nearSphere: {
          $geometry: {
            type: "Point",
            coordinates: [longitude, latitude] // Note: GeoJSON is [longitude, latitude]
          },
          $maxDistance: radiusInMeters
        }
      }
    }).limit(5);
    
    return duplicates;
  } catch (err) {
    console.error('Error checking duplicates:', err);
    return [];
  }
};

module.exports = {
  checkDuplicates
};
