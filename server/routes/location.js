const express = require('express');
const router = express.Router();
const locationService = require('../services/locationService');

// GET /api/location/reverse?lat=...&lng=...
router.get('/reverse', async (req, res) => {
  const { lat, lng, lon } = req.query;
  const targetLon = lng !== undefined ? lng : lon;

  if (lat === undefined || targetLon === undefined) {
    return res.status(400).json({ message: 'Missing lat or lng query parameter' });
  }

  const latNum = parseFloat(lat);
  const lonNum = parseFloat(targetLon);

  if (isNaN(latNum) || isNaN(lonNum) || latNum < -90 || latNum > 90 || lonNum < -180 || lonNum > 180) {
    return res.status(400).json({ message: 'Invalid latitude or longitude coordinates' });
  }

  try {
    const address = await locationService.reverseGeocode(latNum, lonNum);
    return res.json({
      address: address || '',
      display_name: address || ''
    });
  } catch (err) {
    console.error('Reverse geocode route error:', err);
    return res.status(500).json({ message: 'Failed to reverse geocode coordinates' });
  }
});

// GET /api/location/search?q=...
router.get('/search', async (req, res) => {
  const { q } = req.query;
  if (!q || typeof q !== 'string' || q.trim().length === 0) {
    return res.status(400).json({ message: 'Missing search query q' });
  }

  try {
    const results = await locationService.searchLocation(q.trim());
    return res.json(results);
  } catch (err) {
    console.error('Location search route error:', err);
    return res.status(500).json({ message: 'Failed to search location' });
  }
});

module.exports = router;
