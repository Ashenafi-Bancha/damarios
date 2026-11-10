import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import multer from 'multer';
import { HttpError } from '../lib/http';

export const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
]);

/** Image uploads only, saved with random names so users can't choose paths. */
export function imageUpload(maxMb: number) {
  return multer({
    storage: multer.diskStorage({
      destination: UPLOAD_DIR,
      filename: (_req, file, cb) => cb(null, crypto.randomUUID() + (ALLOWED.get(file.mimetype) ?? '')),
    }),
    limits: { fileSize: maxMb * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, cb) => {
      if (ALLOWED.has(file.mimetype)) cb(null, true);
      else cb(new HttpError(400, 'Only JPG, PNG or WebP images are allowed'));
    },
  }).single('file');
}
