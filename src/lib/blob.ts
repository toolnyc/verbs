/**
 * Blob Storage Utilities for VERBS
 *
 * This module provides utilities for uploading and managing files in Vercel Blob Storage.
 *
 * ## File Organization
 * - images/   - Event images, DJ photos, mix covers (uploaded via FileUpload component)
 * - audio/    - Mix audio files (uploaded via FileUpload component)
 * - flyers/   - Event flyers for the "etch" visual effect (see below)
 *
 * ## Flyer/Etch Workflow
 * The "etch" effect displays event flyers with a special visual treatment on the homepage.
 * Currently, flyers need to be uploaded manually to the 'flyers/' prefix in Vercel Blob.
 *
 * To add a flyer:
 * 1. Upload the flyer image to Vercel Blob with prefix 'flyers/'
 * 2. The filename should include a recognizable identifier (e.g., 'flyers/event-name.jpg')
 * 3. Use listFlyers() to retrieve available flyers
 * 4. getTestFlyer() is a temporary helper that finds any blob with "test" in the pathname
 *
 * TODO: Integrate flyer upload into the admin event form using the FileUpload component
 * by adding a flyer_url field to the events table.
 */

import { put, del, list } from '@vercel/blob';

const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
const allowedAudioTypes = ['audio/mpeg', 'audio/aiff', 'audio/wav', 'audio/x-aiff'];
const maxImageSize = 5 * 1024 * 1024; // 5MB

export async function uploadImage(file: File): Promise<string> {
  if (!allowedImageTypes.includes(file.type)) {
    throw new Error(`Invalid image type. Allowed: ${allowedImageTypes.join(', ')}`);
  }

  if (file.size > maxImageSize) {
    throw new Error(`Image too large. Max size: ${maxImageSize / 1024 / 1024}MB`);
  }

  const blob = await put(`images/${Date.now()}-${file.name}`, file, {
    access: 'public',
    contentType: file.type,
    token: import.meta.env.BLOB_READ_WRITE_TOKEN,
  });

  return blob.url;
}

export async function uploadAudio(file: File): Promise<string> {
  if (!allowedAudioTypes.includes(file.type)) {
    throw new Error(`Invalid audio type. Allowed: mp3, aiff, wav`);
  }

  // No size limit for audio (relies on Vercel plan limits)
  const blob = await put(`audio/${Date.now()}-${file.name}`, file, {
    access: 'public',
    contentType: file.type,
    token: import.meta.env.BLOB_READ_WRITE_TOKEN,
  });

  return blob.url;
}

export async function deleteBlob(url: string): Promise<void> {
  await del(url, { token: import.meta.env.BLOB_READ_WRITE_TOKEN });
}

/**
 * List all flyers stored in the 'flyers/' prefix.
 * Returns an array of blob objects with url, pathname, size, etc.
 */
export async function listFlyers() {
  const { blobs } = await list({ prefix: 'flyers/', token: import.meta.env.BLOB_READ_WRITE_TOKEN });
  return blobs;
}

/**
 * Get a test flyer for development purposes.
 * Finds any blob in the flyers/ prefix that contains "test" in its pathname.
 *
 * @deprecated Use the flyer_url field on events once implemented.
 * This is a temporary helper for testing the etch visual effect.
 */
export async function getTestFlyer() {
  const flyers = await listFlyers();
  const testImage = flyers.find((blob) => blob.pathname.includes('test'));
  return testImage?.url;
}

/**
 * Upload a flyer image for an event.
 * Stores in the 'flyers/' prefix with a timestamped filename.
 */
export async function uploadFlyer(file: File): Promise<string> {
  if (!allowedImageTypes.includes(file.type)) {
    throw new Error(`Invalid image type. Allowed: ${allowedImageTypes.join(', ')}`);
  }

  if (file.size > maxImageSize) {
    throw new Error(`Image too large. Max size: ${maxImageSize / 1024 / 1024}MB`);
  }

  const blob = await put(`flyers/${Date.now()}-${file.name}`, file, {
    access: 'public',
    contentType: file.type,
    token: import.meta.env.BLOB_READ_WRITE_TOKEN,
  });

  return blob.url;
}

export function getContentType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  const types: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    mp3: 'audio/mpeg',
    aiff: 'audio/aiff',
    wav: 'audio/wav',
  };
  return types[ext || ''] || 'application/octet-stream';
}
