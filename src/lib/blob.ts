/**
 * Blob Storage Utilities for VERBS
 *
 * This module provides utilities for uploading and managing files in Vercel Blob Storage.
 * Images are automatically optimized (resized to max 1920px, converted to WebP) before upload.
 *
 * ## File Organization
 * - images/   - Event images, DJ photos, mix covers (uploaded via FileUpload component)
 * - audio/    - Mix audio files (uploaded via FileUpload component)
 * - flyers/   - Event flyers for the "etch" visual effect
 */

import { put, del } from '@vercel/blob';
import sharp from 'sharp';

const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
const allowedAudioTypes = ['audio/mpeg', 'audio/aiff', 'audio/wav', 'audio/x-aiff'];
const maxImageSize = 5 * 1024 * 1024; // 5MB
const maxImageDimension = 1920; // Max width/height in pixels
const webpQuality = 82; // WebP quality (0-100)

/**
 * Optimize an image: resize to max dimension and convert to WebP.
 * Returns the optimized buffer and new filename.
 */
async function optimizeImage(file: File): Promise<{ buffer: Buffer; filename: string }> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const optimized = await sharp(buffer)
    .resize(maxImageDimension, maxImageDimension, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: webpQuality })
    .toBuffer();

  // Replace extension with .webp
  const baseName = file.name.replace(/\.[^.]+$/, '');
  const filename = `${baseName}.webp`;

  return { buffer: optimized, filename };
}

export async function uploadImage(file: File): Promise<string> {
  if (!allowedImageTypes.includes(file.type)) {
    throw new Error(`Invalid image type. Allowed: ${allowedImageTypes.join(', ')}`);
  }

  if (file.size > maxImageSize) {
    throw new Error(`Image too large. Max size: ${maxImageSize / 1024 / 1024}MB`);
  }

  const { buffer, filename } = await optimizeImage(file);

  const blob = await put(`images/${Date.now()}-${filename}`, buffer, {
    access: 'public',
    contentType: 'image/webp',
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
 * Upload a flyer image for an event.
 * Stores in the 'flyers/' prefix with a timestamped filename.
 * Images are automatically optimized before upload.
 */
export async function uploadFlyer(file: File): Promise<string> {
  if (!allowedImageTypes.includes(file.type)) {
    throw new Error(`Invalid image type. Allowed: ${allowedImageTypes.join(', ')}`);
  }

  if (file.size > maxImageSize) {
    throw new Error(`Image too large. Max size: ${maxImageSize / 1024 / 1024}MB`);
  }

  const { buffer, filename } = await optimizeImage(file);

  const blob = await put(`flyers/${Date.now()}-${filename}`, buffer, {
    access: 'public',
    contentType: 'image/webp',
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
