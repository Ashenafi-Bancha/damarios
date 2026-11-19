import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { MulterError } from 'multer';

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Lets async route handlers throw; errors go to the error middleware. */
export const ah =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };

/** "dueDate" → "Due date", "items.0.name" → "Name". */
function fieldName(path: (string | number)[]): string {
  const last = [...path].reverse().find((p) => typeof p === 'string') as string | undefined;
  if (!last) return '';
  const words = last.replace(/Id$/, '').replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** A short message people can act on, e.g. "Phone: enter a valid phone number". */
export function zodMessage(err: ZodError): string {
  const parts = err.issues.slice(0, 3).map((i) => {
    const name = fieldName(i.path);
    let msg = i.message;
    if (i.code === 'invalid_type' && i.received === 'undefined') msg = 'is required';
    else if (i.code === 'invalid_enum_value') msg = 'is not one of the allowed choices';
    else if (i.code === 'invalid_date') msg = 'is not a valid date';
    else if (msg === 'Required') msg = 'is required';
    else if (/^(String|Number) must contain at least/.test(msg) || /^String must contain at least/.test(msg)) msg = 'is too short';
    else if (/^(String|Number) must contain at most/.test(msg)) msg = 'is too long';
    return name ? `${name}: ${msg}` : msg;
  });
  return parts.join(' · ');
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }
  if (err instanceof ZodError) {
    return res.status(400).json({ error: zodMessage(err), fields: err.flatten().fieldErrors });
  }
  if (err instanceof MulterError) {
    return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'The image is too large' : err.message });
  }
  // Body that isn't valid JSON, or is too large (from express.json).
  const bodyError = err as { type?: string; status?: number };
  if (bodyError?.type === 'entity.parse.failed') return res.status(400).json({ error: 'The request is not valid JSON' });
  if (bodyError?.type === 'entity.too.large') return res.status(413).json({ error: 'The request is too large' });

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Not found' });
    if (err.code === 'P2002') {
      const target = (err.meta?.target as string[] | undefined)?.join(', ');
      return res.status(409).json({ error: target ? `This ${target} is already used` : 'This already exists' });
    }
    // Two people changed the same thing at the same moment (e.g. the last place in a class).
    if (err.code === 'P2034') return res.status(409).json({ error: 'Someone else just changed this. Please try again.' });
    if (err.code === 'P2003') {
      return req.method === 'DELETE'
        ? res.status(409).json({ error: 'This is linked to other records (history, payments or orders), so it can’t be deleted. Mark it inactive or hidden instead.' })
        : res.status(400).json({ error: 'One of the selected items no longer exists. Reload the page and try again.' });
    }
  }
  if (err instanceof Prisma.PrismaClientValidationError) {
    return res.status(400).json({ error: 'Some of the values are not valid' });
  }
  console.error(err);
  return res.status(500).json({ error: 'Something went wrong. Please try again.' });
}
