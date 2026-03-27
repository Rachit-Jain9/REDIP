const { createClient } = require('@supabase/supabase-js');

let supabaseClient = null;

const isConfiguredValue = (value) => value && !/your[_-]/i.test(value);

const getSupabaseClient = () => {
  if (!supabaseClient) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;

    if (!isConfiguredValue(supabaseUrl) || !isConfiguredValue(supabaseKey)) {
      console.warn('Supabase credentials not configured. File uploads will be disabled.');
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

const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'redevint-documents';

const uploadFile = async (fileBuffer, fileName, mimeType, dealId) => {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase is not configured. Cannot upload files.');
  }

  const filePath = `deals/${dealId}/${Date.now()}-${fileName}`;

  const { data, error } = await client.storage
    .from(STORAGE_BUCKET)
    .upload(filePath, fileBuffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (error) {
    throw new Error(`File upload failed: ${error.message}`);
  }

  return {
    path: data.path,
    fullPath: data.fullPath,
    url: `${process.env.SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${data.path}`,
  };
};

const getSignedUrl = async (filePath, expiresInSeconds = 3600) => {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await client.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(filePath, expiresInSeconds);

  if (error) {
    throw new Error(`Failed to generate signed URL: ${error.message}`);
  }

  return data.signedUrl;
};

const deleteFile = async (filePath) => {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase is not configured.');
  }

  const { error } = await client.storage
    .from(STORAGE_BUCKET)
    .remove([filePath]);

  if (error) {
    throw new Error(`File deletion failed: ${error.message}`);
  }

  return true;
};

module.exports = {
  getSupabaseClient,
  uploadFile,
  getSignedUrl,
  deleteFile,
  STORAGE_BUCKET,
};
