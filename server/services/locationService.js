const NodeGeocoder = require('node-geocoder');

const geocoder = NodeGeocoder({
  provider: 'openstreetmap'
});

const reverseGeocode = async (latitude, longitude) => {
  try {
    const results = await geocoder.reverse({ lat: latitude, lon: longitude });
    if (results && results.length > 0) {
      return results[0].formattedAddress;
    }
    return null;
  } catch (geoErr) {
    console.error('Geocoding error:', geoErr);
    return null;
  }
};

module.exports = {
  reverseGeocode
};
