import { describe, it, expect } from 'vitest';
import sharp from 'sharp';

// Test the image optimization logic directly (without Vercel Blob upload)
describe('Image Optimization', () => {
  const maxImageDimension = 1920;
  const webpQuality = 82;

  async function optimizeImage(buffer: Buffer): Promise<{ buffer: Buffer; metadata: sharp.Metadata }> {
    const optimized = await sharp(buffer)
      .resize(maxImageDimension, maxImageDimension, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: webpQuality })
      .toBuffer();

    const metadata = await sharp(optimized).metadata();
    return { buffer: optimized, metadata };
  }

  it('should convert PNG to WebP and reduce file size', async () => {
    // Create a large PNG test image (2000x2000 red square)
    const originalPng = await sharp({
      create: {
        width: 2000,
        height: 2000,
        channels: 3,
        background: { r: 255, g: 0, b: 0 },
      },
    })
      .png()
      .toBuffer();

    const { buffer: optimized, metadata } = await optimizeImage(originalPng);

    // Should be WebP format
    expect(metadata.format).toBe('webp');

    // Should be resized to max dimension
    expect(metadata.width).toBeLessThanOrEqual(maxImageDimension);
    expect(metadata.height).toBeLessThanOrEqual(maxImageDimension);

    // Should be smaller than original
    expect(optimized.length).toBeLessThan(originalPng.length);

    console.log(`PNG optimization: ${originalPng.length} bytes -> ${optimized.length} bytes (${Math.round((1 - optimized.length / originalPng.length) * 100)}% reduction)`);
  });

  it('should convert JPEG to WebP and reduce file size', async () => {
    // Create a large JPEG test image (2500x1500 gradient)
    const originalJpeg = await sharp({
      create: {
        width: 2500,
        height: 1500,
        channels: 3,
        background: { r: 100, g: 150, b: 200 },
      },
    })
      .jpeg({ quality: 90 })
      .toBuffer();

    const { buffer: optimized, metadata } = await optimizeImage(originalJpeg);

    expect(metadata.format).toBe('webp');
    expect(metadata.width).toBeLessThanOrEqual(maxImageDimension);
    expect(optimized.length).toBeLessThan(originalJpeg.length);

    console.log(`JPEG optimization: ${originalJpeg.length} bytes -> ${optimized.length} bytes (${Math.round((1 - optimized.length / originalJpeg.length) * 100)}% reduction)`);
  });

  it('should not enlarge small images', async () => {
    // Create a small image (500x500)
    const smallPng = await sharp({
      create: {
        width: 500,
        height: 500,
        channels: 3,
        background: { r: 0, g: 255, b: 0 },
      },
    })
      .png()
      .toBuffer();

    const { metadata } = await optimizeImage(smallPng);

    // Should preserve original dimensions (not upscale)
    expect(metadata.width).toBe(500);
    expect(metadata.height).toBe(500);
  });

  it('should maintain aspect ratio when resizing', async () => {
    // Create a wide image (3000x1000)
    const widePng = await sharp({
      create: {
        width: 3000,
        height: 1000,
        channels: 3,
        background: { r: 0, g: 0, b: 255 },
      },
    })
      .png()
      .toBuffer();

    const { metadata } = await optimizeImage(widePng);

    // Width should be capped at 1920, height should scale proportionally
    expect(metadata.width).toBe(1920);
    expect(metadata.height).toBe(640); // 1920 * (1000/3000) = 640

    console.log(`Wide image resize: 3000x1000 -> ${metadata.width}x${metadata.height}`);
  });
});
