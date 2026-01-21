import type { APIRoute } from 'astro';
import { put } from '@vercel/blob';

const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
const allowedAudioTypes = ['audio/mpeg', 'audio/aiff', 'audio/wav', 'audio/x-aiff'];
const maxImageSize = 5 * 1024 * 1024; // 5MB

export const POST: APIRoute = async ({ request, cookies }) => {
  // Check auth (simple cookie check)
  const accessToken = cookies.get('sb-access-token')?.value;
  if (!accessToken) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string; // 'image' or 'audio'

    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No file provided' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate file type
    if (type === 'image') {
      if (!allowedImageTypes.includes(file.type)) {
        return new Response(
          JSON.stringify({ error: 'Invalid image type. Allowed: jpg, png, webp' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (file.size > maxImageSize) {
        return new Response(
          JSON.stringify({ error: 'Image too large. Max size: 5MB' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    } else if (type === 'audio') {
      if (!allowedAudioTypes.includes(file.type)) {
        return new Response(
          JSON.stringify({ error: 'Invalid audio type. Allowed: mp3, aiff, wav' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid upload type' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Generate unique filename
    const ext = file.name.split('.').pop();
    const filename = `${type}s/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

    // Upload to Vercel Blob
    const blob = await put(filename, file, {
      access: 'public',
      contentType: file.type,
      token: import.meta.env.BLOB_READ_WRITE_TOKEN,
    });

    return new Response(
      JSON.stringify({ url: blob.url }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Upload error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Upload failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
