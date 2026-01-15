import { list } from '@vercel/blob';

async function testBlobAccess() {
  console.log('Listing flyers folder...\n');

  const { blobs } = await list({ prefix: 'flyers/' });

  if (blobs.length === 0) {
    console.log('No files found in flyers/ folder');
    return;
  }

  console.log('Found files:');
  blobs.forEach((blob) => {
    console.log(`  - ${blob.pathname}`);
    console.log(`    URL: ${blob.url}`);
    console.log(`    Size: ${blob.size} bytes`);
    console.log('');
  });

  const testImage = blobs.find((blob) => blob.pathname.includes('test'));
  if (testImage) {
    console.log('Test image URL for seed.sql:');
    console.log(testImage.url);
  }
}

testBlobAccess().catch(console.error);
