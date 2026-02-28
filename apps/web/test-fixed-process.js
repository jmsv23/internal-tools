#!/usr/bin/env node

// Simulate the fixed image storage process
const { minioClient } = require('./lib/store/minio.ts');

async function testFixedImageProcess() {
  const testImageId = 'test-image-fix';
  const imageUrl = 'https://image.runpod.ai/seedream-v4/t2i/eeaa851b8484434b911fe790d64d6558/result.jpg';
  
  try {
    // 1. Download image
    console.log('1. Downloading image from RunPod...');
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download: ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    console.log(`   Downloaded ${buffer.length} bytes`);
    
    // 2. Upload to MinIO
    console.log('\\n2. Uploading to MinIO...');
    const objectPath = `images/${testImageId}.png`;
    
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
    console.log(`   Uploaded to: ${objectPath}`);
    
    // 3. Get presigned URL
    console.log('\\n3. Getting presigned URL...');
    const presignedUrl = await minioClient.presignedGetObject(
      'internal-tools-dev',
      objectPath,
      3600
    );
    console.log(`   Presigned URL generated (expires in 1hr)`);
    
    // 4. Test API endpoint format
    console.log('\\n4. API endpoint URL would be:');
    console.log(`   /api/images/${objectPath}`);
    
    console.log('\\n✅ Fixed process works! Image successfully stored in MinIO.');
    
    // Clean up test object
    await minioClient.removeObject('internal-tools-dev', objectPath);
    console.log('\\n🧹 Cleaned up test image');
    
  } catch (error) {
    console.error('\\n❌ Error:', error);
  }
}

testFixedImageProcess();