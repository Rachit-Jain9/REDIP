const axios = require('axios');

/**
 * Geocode an Indian address using Nominatim (OpenStreetMap)
 * Falls back to structured query if free-form fails
 * Rate limit: 1 req/sec for public Nominatim
 */
const geocodeAddress = async (address, city, state, pincode) => {
  const parts = [address, city, state, pincode, 'India'].filter(Boolean);
  const fullAddress = parts.join(', ');

  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        q: fullAddress,
        format: 'json',
        limit: 1,
        countrycodes: 'in',
      },
      headers: {
        'User-Agent': 'REDIP/1.0 (Real Estate Development Intelligence Platform)',
      },
      timeout: 10000,
    });

    if (response.data && response.data.length > 0) {
      return {
        lat: parseFloat(response.data[0].lat),
        lng: parseFloat(response.data[0].lon),
        displayName: response.data[0].display_name,
      };
    }

    // Fallback: try with just city + state
    const fallbackResponse = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        city,
        state,
        country: 'India',
        format: 'json',
        limit: 1,
      },
      headers: {
        'User-Agent': 'REDIP/1.0 (Real Estate Development Intelligence Platform)',
      },
      timeout: 10000,
    });

    if (fallbackResponse.data && fallbackResponse.data.length > 0) {
      return {
        lat: parseFloat(fallbackResponse.data[0].lat),
        lng: parseFloat(fallbackResponse.data[0].lon),
        displayName: fallbackResponse.data[0].display_name,
      };
    }

    return null;
  } catch (error) {
    console.error('Geocoding error:', error.message);
    return null;
  }
};

module.exports = { geocodeAddress };
