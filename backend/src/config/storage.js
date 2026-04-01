'use strict';

/**
 * Storage abstraction — Vercel Blob (primary) with Supabase fallback.
 *
 * Vercel Blob:   requires BLOB_READ_WRITE_TOKEN env var
 * Supabase:      requires SUPABASE_URL + SUPABASE_KEY env vars
 *
 * file_url convention:
 *   Vercel Blob  → full https:// URL  (public/tokenized access, use directly)
 *   Supabase     → storage path only  (requires signed URL generation)
 */

const { uploadFile: supabaseUpload, getSignedUrl: supabaseSignedUrl, deleteFile: supabaseDelete } = require('./supabase');

const isVercelBlobConfigured = () => !!process.env.BLOB_READ_WRITE_TOKEN;

// Lazy-load @vercel/blob so the server starts even without the package installed
let _blob = null;
const getBlob = () => {
  if (!_blob) {
    try { _blob = require('@vercel/blob'); } catch {
      throw new Error('@vercel/blob is not installed. Run: npm install @vercel/blob in the backend directory.');
    }
  }
  return _blob;
};

/**
 * Upload a file. Returns { url, isBlob } where:
 *   url     = storage identifier stored in documents.file_url
 *   isBlob  = true if stored in Vercel Blob (url is a full https URL)
 */
const uploadFile = async (fileBuffer, fileName, mimeType, dealId) => {
  if (isVercelBlobConfigured()) {
    const { put } = getBlob();
    const pathname = `deals/${dealId}/${Date.now()}-${fileName}`;
    const blob = await put(pathname, fileBuffer, {
      access: 'public',
      contentType: mimeType,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return { url: blob.url, isBlob: true };
  }

  // Fallback to Supabase
  const result = await supabaseUpload(fileBuffer, fileName, mimeType, dealId);
  return { url: result.path, isBlob: false };
};

/**
 * Get a download URL for a stored document.
 *   Vercel Blob  → URL is already publicly accessible, return as-is
 *   Supabase     → generate a 1-hour signed URL
 */
const getDownloadUrl = async (fileUrl, expiresInSeconds = 3600) => {
  if (fileUrl && fileUrl.startsWith('https://')) {
    // Vercel Blob URL — already accessible
    return fileUrl;
  }
  // Supabase path — generate signed URL
  return supabaseSignedUrl(fileUrl, expiresInSeconds);
};

/**
 * Delete a stored file.
 */
const deleteStorageFile = async (fileUrl) => {
  if (fileUrl && fileUrl.startsWith('https://')) {
    if (isVercelBlobConfigured()) {
      const { del } = getBlob();
      await del(fileUrl, { token: process.env.BLOB_READ_WRITE_TOKEN });
    }
    // If blob not configured but URL is https, skip silently (file may already be gone)
    return;
  }
  // Supabase path
  await supabaseDelete(fileUrl);
};

module.exports = { uploadFile, getDownloadUrl, deleteStorageFile };
