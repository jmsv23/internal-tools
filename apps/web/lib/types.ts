export interface MinioConfig {
  endPoint: string;
  port: number;
  useSSL: boolean;
  accessKey: string;
  secretKey: string;
  defaultBucket: string;
  region?: string;
}

export interface MinioUploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
}

export interface MinioPresignedUrlOptions {
  expirySeconds?: number;
  respHeaders?: Record<string, string>;
}
