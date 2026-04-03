'use strict';

/**
 * Geocoding for Indian addresses.
 * Primary:  Google Maps Geocoding API (requires GOOGLE_MAPS_API_KEY)
 * Fallback: Nominatim / OpenStreetMap (free, rate-limited to ~1 req/sec)
 *
 * Geocode status values stored on properties:
 *   verified    – high-confidence match (place_id or full address match)
 *   approximate – city-level match only (confidence < 0.6)
 *   failed      – no match found
 *   pending     – not yet geocoded
 */

const axios = require('axios');

const GOOGLE_MAPS_KEY = () => process.env.GOOGLE_MAPS_API_KEY;

const isGoogleConfigured = () => {
  const key = GOOGLE_MAPS_KEY();
  return key && !/your[_-]/i.test(key) && !key.startsWith('[') && key.startsWith('AIza');
};

// ─── GOOGLE MAPS ──────────────────────────────────────────────────────────────

const geocodeWithGoogle = async (address, city, state, pincode) => {
  const parts = [address, city, state, pincode, 'India'].filter(Boolean);
  const fullAddress = parts.join(', ');

  if (!fullAddress || fullAddress === 'India') {
    return { found: false, status: 'insufficient_data', message: 'Insufficient address data to geocode.' };
  }

  try {
    const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
      params: {
        address: fullAddress,
        region: 'in',
        key: GOOGLE_MAPS_KEY(),
      },
      timeout: 10000,
    });

    const data = response.data;

    if (data.status === 'REQUEST_DENIED') {
      console.warn('[Geocode] Google Maps API key denied:', data.error_message);
      return null; // trigger fallback
    }

    if (data.status === 'OK' && data.results?.length > 0) {
      const result = data.results[0];
      const { lat, lng } = result.geometry.location;
      const types = result.types || [];

      // Determine confidence and status from result precision
      const isPointMatch = types.some((t) => ['premise', 'street_address', 'route', 'sublocality', 'neighborhood'].includes(t));
      const isCityMatch  = types.some((t) => ['locality', 'administrative_area_level_2'].includes(t));

      let status = 'verified';
      let confidence = 0.92;

      if (isCityMatch && !isPointMatch) {
        status = 'approximate';
        confidence = 0.45;
      } else if (!isPointMatch && !isCityMatch) {
        status = 'approximate';
        confidence = 0.30;
      }

      return {
        found: true,
        lat,
        lng,
        displayName: result.formatted_address,
        placeId: result.place_id,
        status,
        confidence,
        message: `Google Maps: ${result.formatted_address}`,
        provider: 'google',
      };
    }

    if (data.status === 'ZERO_RESULTS') {
      // Try city-only fallback via Google
      if (city) {
        const fallbackParts = [city, state || 'India', 'India'].filter(Boolean);
        const cityResponse = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
          params: { address: fallbackParts.join(', '), region: 'in', key: GOOGLE_MAPS_KEY() },
          timeout: 8000,
        });

        if (cityResponse.data.status === 'OK' && cityResponse.data.results?.length > 0) {
          const r = cityResponse.data.results[0];
          const { lat, lng } = r.geometry.location;
          return {
            found: true,
            lat,
            lng,
            displayName: r.formatted_address,
            placeId: r.place_id,
            status: 'approximate',
            confidence: 0.45,
            message: `Google Maps city-level fallback: ${r.formatted_address}`,
            provider: 'google',
          };
        }
      }

      return { found: false, status: 'failed', message: 'No geocode match found via Google Maps.' };
    }

    console.warn('[Geocode] Google Maps unexpected status:', data.status);
    return null; // trigger Nominatim fallback
  } catch (error) {
    console.error('[Geocode] Google Maps error:', error.message);
    return null; // trigger Nominatim fallback
  }
};

// ─── NOMINATIM (FALLBACK) ─────────────────────────────────────────────────────

const geocodeWithNominatim = async (address, city, state, pincode) => {
  const parts = [address, city, state, pincode, 'India'].filter(Boolean);
  const fullAddress = parts.join(', ');

  if (!fullAddress || fullAddress === 'India') {
    return { found: false, status: 'insufficient_data', message: 'Insufficient address data to geocode.' };
  }

  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: { q: fullAddress, format: 'json', limit: 1, countrycodes: 'in' },
      headers: { 'User-Agent': 'REDIP/1.0 (Real Estate Development Intelligence Platform)' },
      timeout: 10000,
    });

    if (response.data?.length > 0) {
      return {
        found: true,
        lat: parseFloat(response.data[0].lat),
        lng: parseFloat(response.data[0].lon),
        displayName: response.data[0].display_name,
        status: 'verified',
        confidence: 0.85,
        message: 'Nominatim: full address match.',
        provider: 'nominatim',
      };
    }

    if (city || state) {
      const fallbackResponse = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: { city, state, country: 'India', format: 'json', limit: 1 },
        headers: { 'User-Agent': 'REDIP/1.0 (Real Estate Development Intelligence Platform)' },
        timeout: 10000,
      });

      if (fallbackResponse.data?.length > 0) {
        return {
          found: true,
          lat: parseFloat(fallbackResponse.data[0].lat),
          lng: parseFloat(fallbackResponse.data[0].lon),
          displayName: fallbackResponse.data[0].display_name,
          status: 'approximate',
          confidence: 0.45,
          message: 'Nominatim: city-level fallback only.',
          provider: 'nominatim',
        };
      }
    }

    return { found: false, status: 'failed', message: 'No geocode match found via Nominatim.' };
  } catch (error) {
    console.error('[Geocode] Nominatim error:', error.message);
    return { found: false, status: 'failed', message: `Geocoding service unavailable: ${error.message}` };
  }
};

// ─── PUBLIC API ───────────────────────────────────────────────────────────────

const geocodeAddress = async (address, city, state, pincode) => {
  if (isGoogleConfigured()) {
    const googleResult = await geocodeWithGoogle(address, city, state, pincode);
    if (googleResult !== null) return googleResult; // null = try fallback
  }

  return geocodeWithNominatim(address, city, state, pincode);
};

module.exports = { geocodeAddress };
