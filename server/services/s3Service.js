const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

function isS3Enabled() {
  return Boolean(
    process.env.S3_BUCKET &&
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY
  );
}

async function uploadFilesToS3(files, userId) {
  if (!isS3Enabled()) return [];

  const bucket = process.env.S3_BUCKET;
  const region = process.env.AWS_REGION || 'us-east-1';
  const client = new S3Client({
    region,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  const uploaded = [];
  for (const f of files) {
    const base = path.basename(f.path || f.filename || 'file');
    const key = `itineraries/${userId}/${Date.now()}-${base}`;
    const body = fs.readFileSync(f.path);

    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: f.mimetype || 'application/octet-stream',
      })
    );

    uploaded.push({
      key,
      filename: f.originalname || f.filename || base,
      url: `https://${bucket}.s3.${region}.amazonaws.com/${key}`,
    });
  }

  return uploaded;
}

module.exports = { isS3Enabled, uploadFilesToS3 };
