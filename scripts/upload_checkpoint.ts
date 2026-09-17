import fs from 'node:fs';
import path from 'node:path';
import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import dotenv from 'dotenv';

dotenv.config();

const rawEndpoint = process.env.R2_ENDPOINT_URL;
const rawBucket = process.env.R2_BUCKET;
const rawAccessKey = process.env.AWS_ACCESS_KEY_ID;
const rawSecretKey = process.env.AWS_SECRET_ACCESS_KEY;
const defaultCheckpointKey = process.env.CHECKPOINT_KEY || 'checkpoints/wan2.2_i2v_high_noise_14B_Q3_K_S.gguf';

function log(step: string, message: string) {
  const timestamp = new Date().toISOString().substring(11, 19);
  console.log(`[${timestamp}] [${step}] ${message}`);
}

if (!rawEndpoint || !rawBucket || !rawAccessKey || !rawSecretKey) {
  log('ERROR', 'Missing required Cloudflare R2 credentials in .env file.');
  process.exit(1);
}

// Credential length heuristic check to catch swapped keys
if (rawAccessKey.length === 64 && rawSecretKey.length === 32) {
  log('FATAL', 'AWS_ACCESS_KEY_ID (64 chars) and AWS_SECRET_ACCESS_KEY (32 chars) appear swapped in .env! Swap them before running.');
  process.exit(1);
}

const R2_ENDPOINT_URL: string = rawEndpoint;
const R2_BUCKET: string = rawBucket;
const AWS_ACCESS_KEY_ID: string = rawAccessKey;
const AWS_SECRET_ACCESS_KEY: string = rawSecretKey;

const localFilePath = process.argv[2];
const destinationKey = process.argv[3] || defaultCheckpointKey;

if (!localFilePath) {
  console.error('\nUsage: npx tsx scripts/upload_checkpoint.ts <path-to-file> [optional-destination-key]\n');
  process.exit(1);
}

const resolvedPath = path.resolve(localFilePath);
if (!fs.existsSync(resolvedPath)) {
  log('FATAL', `File not found at: ${resolvedPath}`);
  process.exit(1);
}

const fileStats = fs.statSync(resolvedPath);
const totalBytes = fileStats.size;
const totalMb = (totalBytes / (1024 * 1024)).toFixed(2);
const totalGb = (totalBytes / (1024 * 1024 * 1024)).toFixed(2);

console.log('='.repeat(70));
log('INIT', 'Preparing Cloudflare R2 Multipart Checkpoint Upload');
log('FILE', `Path: ${resolvedPath}`);
log('SIZE', `${totalMb} MB (${totalGb} GB)`);
log('TARGET', `Bucket: ${R2_BUCKET} | Key: ${destinationKey}`);
console.log('='.repeat(70));

const s3Client = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT_URL,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  },
});

async function runUpload() {
  const fileStream = fs.createReadStream(resolvedPath);
  const startTime = Date.now();
  let lastLoaded = 0;
  let lastTime = Date.now();

  const parallelUpload = new Upload({
    client: s3Client,
    params: {
      Bucket: R2_BUCKET,
      Key: destinationKey,
      Body: fileStream,
      ContentType: 'application/octet-stream',
    },
    partSize: 20 * 1024 * 1024, // 20 MB chunks
    queueSize: 4, // 4 concurrent connections
  });

  parallelUpload.on('httpUploadProgress', (progress) => {
    if (!progress.loaded) return;
    const now = Date.now();
    const timeDelta = (now - lastTime) / 1000;
    const bytesDelta = progress.loaded - lastLoaded;
    const speedMbSec = timeDelta > 0 ? (bytesDelta / (1024 * 1024) / timeDelta).toFixed(1) : '0.0';
    const percent = progress.total ? ((progress.loaded / progress.total) * 100).toFixed(1) : '??';
    const loadedMb = (progress.loaded / (1024 * 1024)).toFixed(1);

    process.stdout.write(`\r[STREAMING] ${loadedMb} MB / ${totalMb} MB (${percent}%) @ ${speedMbSec} MB/s `);

    lastLoaded = progress.loaded;
    lastTime = now;
  });

  try {
    await parallelUpload.done();
    const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(1);
    const avgSpeed = ((totalBytes / (1024 * 1024)) / parseFloat(elapsedSeconds)).toFixed(1);
    console.log('\n' + '='.repeat(70));
    log('SUCCESS', `Upload finished in ${elapsedSeconds}s (Average Speed: ${avgSpeed} MB/s)`);
    log('VERIFIED', `Stored at: s3://${R2_BUCKET}/${destinationKey}`);
    console.log('='.repeat(70));
  } catch (error) {
    console.log('\n');
    log('FATAL', `Multipart upload failed: ${error}`);
    process.exit(1);
  }
}

runUpload();
