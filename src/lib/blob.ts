import { put, del } from '@vercel/blob';

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
  });

  return blob.url;
}

export async function deleteBlob(url: string): Promise<void> {
  await del(url);
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
