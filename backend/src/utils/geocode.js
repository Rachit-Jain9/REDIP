const axios = require('axios');

/**
 * Geocode an Indian address using Nominatim (OpenStreetMap)
 * Falls back to structured query if free-form fails
 * Rate limit: 1 req/sec for public Nominatim
 */
const geocodeAddress = async (address, city, state, pincode) => {
  const parts = [address, city, state, pincode, 'India'].filter(Boolean);
  const fullAddress = parts.join(', ');

  if (!fullAddress || fullAddress === 'India') {
    return {
      found: false,
      status: 'insufficient_data',
      message: 'Address details are incomplete. Add at least a city or address to geocode this property.',
    };
  }

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
        found: true,
        lat: parseFloat(response.data[0].lat),
        lng: parseFloat(response.data[0].lon),
        displayName: response.data[0].display_name,
        status: 'matched',
        confidence: 0.95,
        message: 'Property matched using the full address.',
      };
    }

    if (!city && !state) {
      return {
        found: false,
        status: 'failed',
        message: 'No map match found for the current address.',
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
        found: true,
        lat: parseFloat(fallbackResponse.data[0].lat),
        lng: parseFloat(fallbackResponse.data[0].lon),
        displayName: fallbackResponse.data[0].display_name,
        status: 'approximate',
        confidence: 0.45,
        message: 'Only an approximate city-level map match was found.',
      };
    }

    return {
      found: false,
      status: 'failed',
      message: 'No map match found for the current address.',
    };
  } catch (error) {
    console.error('Geocoding error:', error.message);
    return {
      found: false,
      status: 'failed',
      message: `Geocoding service unavailable: ${error.message}`,
    };
  }
};

module.exports = { geocodeAddress };
