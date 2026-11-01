const NodeGeocoder = require('node-geocoder');

const geocoder = NodeGeocoder({
  provider: 'openstreetmap',
  headers: {
    'user-agent': 'CivicConnect-Portal/1.0 (civic-issues-portal@civicconnect.local)'
  }
});

// Centralized throttling state to strictly comply with OSM 1 req/sec policy
let lastRequestTime = 0;
const MIN_INTERVAL_MS = 1000;
let throttleQueue = Promise.resolve();

const throttledCall = async (fn) => {
  const execute = async () => {
    const now = Date.now();
    const elapsed = now - lastRequestTime;
    if (elapsed < MIN_INTERVAL_MS && lastRequestTime > 0) {
      await new Promise(resolve => setTimeout(resolve, MIN_INTERVAL_MS - elapsed));
    }
    lastRequestTime = Date.now();
    return await fn();
  };

  const current = throttleQueue.then(execute, execute);
  throttleQueue = current.catch(() => {});
  return current;
};

// In-memory caches to minimize external API hits
const reverseGeocodeCache = new Map();
const MAX_CACHE_ENTRIES = 500;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const searchCache = new Map();
const MAX_SEARCH_CACHE_ENTRIES = 200;

const getCacheKey = (lat, lng) => `${Number(lat).toFixed(4)},${Number(lng).toFixed(4)}`;

const reverseGeocode = async (latitude, longitude) => {
  if (latitude === undefined || latitude === null || longitude === undefined || longitude === null) {
    return null;
  }

  const latNum = Number(latitude);
  const lngNum = Number(longitude);

  if (isNaN(latNum) || isNaN(lngNum) || latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
    return null;
  }

  const key = getCacheKey(latNum, lngNum);
  const cached = reverseGeocodeCache.get(key);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
    return cached.address;
  }

  try {
    const results = await throttledCall(() => geocoder.reverse({ lat: latNum, lon: lngNum }));
    if (results && results.length > 0 && results[0].formattedAddress) {
      const address = results[0].formattedAddress;
      
      // Enforce cache size boundary
      if (reverseGeocodeCache.size >= MAX_CACHE_ENTRIES) {
        const oldestKey = reverseGeocodeCache.keys().next().value;
        reverseGeocodeCache.delete(oldestKey);
      }
      
      reverseGeocodeCache.set(key, {
        address,
        timestamp: Date.now()
      });
      return address;
    }
    return null;
  } catch (geoErr) {
    console.error('Geocoding error:', geoErr.message || geoErr);
    return null;
  }
};

const searchLocation = async (query) => {
  if (!query || typeof query !== 'string') return [];
  const cleanQuery = query.trim().toLowerCase();
  if (cleanQuery.length < 2) return [];

  const cached = searchCache.get(cleanQuery);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
    return cached.results;
  }

  try {
    const results = await throttledCall(() => geocoder.geocode(cleanQuery));
    if (results && Array.isArray(results)) {
      const formatted = results.map(r => ({
        lat: r.latitude,
        lon: r.longitude,
        display_name: r.formattedAddress || `${r.streetName || ''} ${r.city || ''} ${r.country || ''}`.trim()
      })).filter(r => r.lat && r.lon && r.display_name);

      if (searchCache.size >= MAX_SEARCH_CACHE_ENTRIES) {
        const oldestKey = searchCache.keys().next().value;
        searchCache.delete(oldestKey);
      }

      searchCache.set(cleanQuery, {
        results: formatted,
        timestamp: Date.now()
      });
      return formatted;
    }
    return [];
  } catch (err) {
    console.error('Search geocoding error:', err.message || err);
    return [];
  }
};

const clearGeocodeCache = () => {
  reverseGeocodeCache.clear();
  searchCache.clear();
};

module.exports = {
  reverseGeocode,
  searchLocation,
  clearGeocodeCache,
  getCacheSize: () => reverseGeocodeCache.size,
  getSearchCacheSize: () => searchCache.size
};

