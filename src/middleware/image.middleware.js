import config from "../config.js";
import { createClient } from "@supabase/supabase-js";

// Example image url from supabase storage 
// https://<project-ref>.supabase.co/storage/v1/object/public/<bucket>/<object_path>
const supabase = createClient(
  config.supabase.url,
  config.supabase.secret_key,
);
// Pass secret key to allow backend server to access supabase project bypassing RLS
// Allows direct , fetch , write , read ,... 

const BUCKET = config.supabase.bucket_name ?? "ingredients"; // or just default to ingredient


/**
 * Get a public URL for an image stored in Supabase Storage.
 * @param {string} filePath - Path inside the bucket, e.g. "rice.jpg"
 * @returns {string} Public URL
 */
export function getImageUrl(filePath) {
  const { data, error } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(filePath);
  if (error) throw new Error(`Supabase public url failed: ${error.message}`);
  return data.publicUrl;
}

/**
 * Get a short-lived signed URL for a PRIVATE bucket object.
 * Use this instead of getImageUrl when the bucket is not public.
 * @param {string} filePath   - Path inside the bucket, e.g. "rice.jpg"
 * @param {number} expiresIn  - Seconds until the URL expires (default 1h)
 * @returns {Promise<string>} Signed URL (expires) — FE must refetch when stale
 */
export async function getSignedUrl(filePath, expiresIn = 60 * 60) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(filePath, expiresIn);
  if (error) throw new Error(`Supabase signed URL failed: ${error.message}`);
  return data.signedUrl;
}

/**
 * Upload an image buffer to Supabase Storage.
 * @param {string} filePath  - Destination path in bucket, e.g. "garlic.png"
 * @param {Buffer} buffer    - File contents
 * @param {string} mimeType  - e.g. "image/jpeg"
 * @returns {Promise<string>} Public URL of uploaded file
 */
export async function uploadImage(filePath, buffer, mimeType) {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, buffer, {
      contentType: mimeType,
      upsert: true,
    });

  if (error) throw new Error(`Supabase upload failed: ${error.message}`);

  return getImageUrl(filePath);
}

/**
 * Delete an image from Supabase Storage.
 * @param {string} filePath - Path inside the bucket
 */
export async function deleteImage(filePath) {
  const { error } = await supabase.storage.from(BUCKET).remove([filePath]);
  if (error) throw new Error(`Supabase delete failed: ${error.message}`);
}
