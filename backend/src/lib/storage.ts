/**
 * Where uploaded photos are kept.
 *  - Production: DigitalOcean Spaces (S3-compatible file storage with a CDN). Photos survive deploys and restarts.
 *  - Development: the backend's uploads/ folder, served by the API at /uploads.
 * The choice follows the SPACES_* settings (see config.ts).
 */
import path from 'path';
import fs from 'fs/promises';
import { mkdirSync } from 'fs';
import crypto from 'crypto';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { config } from '../config';

export const LOCAL_UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');
if (!config.spaces) mkdirSync(LOCAL_UPLOAD_DIR, { recursive: true });

/** Folder inside the bucket. */
const PREFIX = 'uploads';

export const IMAGE_TYPES = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
]);

const s3 = config.spaces
  ? new S3Client({
      endpoint: config.spaces.endpoint,
      // The datacenter is set by the endpoint; DigitalOcean's examples sign requests with this fixed region name.
      region: 'us-east-1',
      credentials: { accessKeyId: config.spaces.key, secretAccessKey: config.spaces.secret },
      // Spaces (like S3) address buckets as https://<bucket>.<region>.digitaloceanspaces.com
      forcePathStyle: false,
    })
  : null;

/** Checks the first bytes of the file, so a renamed non-image can't be uploaded as a photo. */
export function looksLikeImage(buf: Buffer, mimetype: string): boolean {
  if (mimetype === 'image/jpeg') return buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  if (mimetype === 'image/png') return buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (mimetype === 'image/webp') return buf.length > 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP';
  return false;
}

/** Saves a photo under a random name and returns the address to show it from. */
export async function saveImage(buf: Buffer, mimetype: string): Promise<string> {
  const name = crypto.randomUUID() + (IMAGE_TYPES.get(mimetype) ?? '');
  if (s3 && config.spaces) {
    await s3.send(new PutObjectCommand({
      Bucket: config.spaces.bucket,
      Key: `${PREFIX}/${name}`,
      Body: buf,
      ContentType: mimetype,
      ACL: 'public-read',
      // The name never changes for a given photo, so browsers and the CDN may keep it for a year.
      CacheControl: 'public, max-age=31536000, immutable',
    }));
    return `${config.spaces.publicUrl}/${PREFIX}/${name}`;
  }
  await fs.writeFile(path.join(LOCAL_UPLOAD_DIR, name), buf);
  return `/uploads/${name}`;
}

/** True for an address this server handed out for an uploaded photo (used to validate form attachments). */
export function isUploadedImageUrl(url: string): boolean {
  const file = /^[\w-]+\.(jpg|png|webp)$/;
  if (url.startsWith('/uploads/')) return file.test(url.slice('/uploads/'.length));
  if (config.spaces && url.startsWith(`${config.spaces.publicUrl}/${PREFIX}/`)) {
    return file.test(url.slice(`${config.spaces.publicUrl}/${PREFIX}/`.length));
  }
  return false;
}
