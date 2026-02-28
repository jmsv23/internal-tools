#!/usr/bin/env node

// This script simulates the downloadAndStoreImage function to debug where it might be failing
const { minioClient } = require('./lib/store/minio.ts');

async function debugImageDownload(imageUrl, imageId) {
  console.log(`Debugging image download for ID: ${imageId}`);
  console.log(`Original URL: ${imageUrl}`);
  
  try {
    // 1. Try to download the image
    console.log('\n1. Downloading image...');
    const response = await fetch(imageUrl);
    
    if (!response.ok) {
      console.error(`Failed to download: ${response.status} ${response.statusText}`);
      return;
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    console.log(`Downloaded ${buffer.length} bytes`);
    
    // 2. Try to upload to MinIO
    console.log('\n2. Uploading to MinIO...');
    const objectPath = `images/${imageId}.png`;
    
    await minioClient.putObject(
      'internal-tools-dev',
      objectPath,
      buffer,
      buffer.length,
      {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000'
      }
    );
    
    console.log(`Successfully uploaded to ${objectPath}`);
    
    // 3. Verify the upload
    console.log('\n3. Verifying upload...');
    const stat = await minioClient.statObject('internal-tools-dev', objectPath);
    console.log('Object stats:', {
      size: stat.size,
      lastModified: stat.lastModified,
      etag: stat.etag
    });
    
    // 4. Test presigned URL
    console.log('\n4. Testing presigned URL...');
    const presignedUrl = await minioClient.presignedGetObject(
      'internal-tools-dev',
      objectPath,
      3600
    );
    console.log('Presigned URL:', presignedUrl.substring(0, 100) + '...');
    
    console.log('\n✅ All steps successful!');
    
  } catch (error) {
    console.error('\n❌ Error:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Test with a sample image URL and ID
debugImageDownload(
  'https://fal.media/files/bear/Bear-ff0q_1gQ2jYYdlmmVh5fU_1728000000.png',
  'test-image-id'
).catch(console.error);