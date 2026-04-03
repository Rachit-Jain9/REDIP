'use strict';

/**
 * Supabase client — server-side only.
 * Uses the SERVICE ROLE key (from SUPABASE_KEY env var).
 * Never expose this key to the browser or client bundles.
 *
 * Used exclusively for file storage operations.
 * The database connection is handled separately by config/database.js (pg Pool).
 */

const { createClient } = require('@supabase/supabase-js');

let supabaseClient = null;

const isConfigured = (value) =>
  value && !/your[_-]/i.test(value) && !value.startsWith('[') && value.length > 10;

const getSupabaseClient = () => {
  if (!supabaseClient) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY; // must be service role key

    if (!isConfigured(supabaseUrl) || !isConfigured(supabaseKey)) {
      console.warn('[Supabase] Credentials not configured. File storage via Supabase is disabled.');
      return null;
    }

    supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return supabaseClient;
};

const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'redip-documents';

/**
 * Upload a file to Supabase Storage (private bucket).
 * Returns the storage path — NOT a public URL.
 * Call getSignedUrl() to generate a time-limited access URL.
 */
const uploadFile = async (fileBuffer, fileName, mimeType, dealId) => {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase storage is not configured (SUPABASE_URL / SUPABASE_KEY missing).');

  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = `deals/${dealId}/${Date.now()}-${safeName}`;

  const { data, error } = await client.storage
    .from(STORAGE_BUCKET)
    .upload(filePath, fileBuffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (error) throw new Error(`Supabase upload failed: ${error.message}`);

  return {
    path: data.path,
    fullPath: data.fullPath,
    // Return path only — signed URL is generated on demand
    url: data.path,
  };
};

/**
 * Generate a time-limited signed URL for a stored file.
 * Default expiry: 1 hour.
 */
const getSignedUrl = async (filePath, expiresInSeconds = 3600) => {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase storage is not configured.');

  const { data, error } = await client.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(filePath, expiresInSeconds);

  if (error) throw new Error(`Signed URL generation failed: ${error.message}`);
  return data.signedUrl;
};

/**
 * Delete a file from Supabase Storage.
 */
const deleteFile = async (filePath) => {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase storage is not configured.');

  const { error } = await client.storage.from(STORAGE_BUCKET).remove([filePath]);
  if (error) throw new Error(`Supabase delete failed: ${error.message}`);
  return true;
};

module.exports = {
  getSupabaseClient,
  uploadFile,
  getSignedUrl,
  deleteFile,
  STORAGE_BUCKET,
};
