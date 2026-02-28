#!/usr/bin/env node

const Minio = require('minio');

// Load configuration from environment
const config = {
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9200', 10),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
  defaultBucket: process.env.MINIO_BUCKET_NAME || 'internal-tools-dev',
  region: process.env.MINIO_REGION || 'us-east-1',
};

console.log('Testing MinIO configuration...');
console.log('Config:', {
  endPoint: config.endPoint,
  port: config.port,
  useSSL: config.useSSL,
  accessKey: config.accessKey,
  secretKey: config.secretKey ? '***' : 'undefined',
  defaultBucket: config.defaultBucket,
  region: config.region,
});

// Create MinIO client
const minioClient = new Minio.Client({
  endPoint: config.endPoint,
  port: config.port,
  useSSL: config.useSSL,
  accessKey: config.accessKey,
  secretKey: config.secretKey,
});

async function testConnection() {
  try {
    // Test 1: List buckets
    console.log('\n1. Testing bucket list...');
    const buckets = await minioClient.listBuckets();
    console.log('Buckets:', buckets.map(b => b.name));
    
    // Test 2: Check if default bucket exists
    console.log('\n2. Testing default bucket existence...');
    const bucketExists = await minioClient.bucketExists(config.defaultBucket);
    console.log(`Bucket "${config.defaultBucket}" exists:`, bucketExists);
    
    // Test 3: Create bucket if it doesn't exist
    if (!bucketExists) {
      console.log('\n3. Creating default bucket...');
      await minioClient.makeBucket(config.defaultBucket, config.region);
      console.log(`Bucket "${config.defaultBucket}" created successfully`);
    }
    
    // Test 4: Test upload and download
    console.log('\n4. Testing upload/download...');
    const testObject = 'test-upload.txt';
    const testContent = 'Hello MinIO!';
    
    await minioClient.putObject(config.defaultBucket, testObject, testContent);
    console.log(`Uploaded "${testObject}" successfully`);
    
    const dataStream = await minioClient.getObject(config.defaultBucket, testObject);
    const downloadedContent = await streamToString(dataStream);
    console.log(`Downloaded content: "${downloadedContent}"`);
    
    // Clean up test object
    await minioClient.removeObject(config.defaultBucket, testObject);
    console.log(`Removed test object "${testObject}"`);
    
    console.log('\n✅ All tests passed! MinIO connection is working correctly.');
    
  } catch (error) {
    console.error('\n❌ Error testing MinIO connection:', error);
    process.exit(1);
  }
}

// Helper function to convert stream to string
function streamToString(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks).toString()));
  });
}

testConnection();