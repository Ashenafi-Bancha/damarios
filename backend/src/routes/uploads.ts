import type { RequestHandler } from 'express';
import multer from 'multer';
import { ah, HttpError } from '../lib/http';
import { IMAGE_TYPES, looksLikeImage, saveImage } from '../lib/storage';

/**
 * Handlers for a photo upload route: accepts one JPG, PNG or WebP image (sent as the form field "file"),
 * checks it really is an image, stores it under a random name, and answers { url }.
 */
export function imageUploadRoute(maxMb: number): RequestHandler[] {
  const receive = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxMb * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, cb) => {
      if (IMAGE_TYPES.has(file.mimetype)) cb(null, true);
      else cb(new HttpError(400, 'Only JPG, PNG or WebP images are allowed'));
    },
  }).single('file');

  const store = ah(async (req, res) => {
    if (!req.file) throw new HttpError(400, 'No file received');
    if (!looksLikeImage(req.file.buffer, req.file.mimetype)) throw new HttpError(400, 'This file is not a valid image');
    const url = await saveImage(req.file.buffer, req.file.mimetype);
    res.status(201).json({ url });
  });

  return [receive, store];
}
