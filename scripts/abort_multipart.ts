// scripts/abort_multipart.ts
import {
  S3Client,
  ListMultipartUploadsCommand,
  AbortMultipartUploadCommand,
} from "@aws-sdk/client-s3";
import "dotenv/config";

const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT_URL,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

async function abortAll() {
  const bucket = process.env.R2_BUCKET || "production-checkpoints-us-east";
  const res = await s3.send(
    new ListMultipartUploadsCommand({ Bucket: bucket }),
  );

  if (!res.Uploads || res.Uploads.length === 0) {
    console.log("No pending multipart uploads found.");
    return;
  }

  for (const u of res.Uploads) {
    console.log(`Aborting upload: Key=${u.Key} UploadId=${u.UploadId}`);
    await s3.send(
      new AbortMultipartUploadCommand({
        Bucket: bucket,
        Key: u.Key,
        UploadId: u.UploadId,
      }),
    );
  }
  console.log("Done.");
}

abortAll();
