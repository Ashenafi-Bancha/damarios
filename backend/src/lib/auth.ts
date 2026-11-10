import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { Role } from '@prisma/client';
import { prisma } from './prisma';
import { HttpError } from './http';
import type { ModuleName } from './modules';

export const COOKIE = 'dm_session';
const SECRET = process.env.JWT_SECRET || 'dev-only-secret';
if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET must be set in production');
}

export interface SessionUser {
  id: string;
  name: string;
  role: Role;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: SessionUser;
    }
  }
}

export function signSession(user: SessionUser) {
  return jwt.sign(user, SECRET, { expiresIn: '12h' });
}

export const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  maxAge: 12 * 60 * 60 * 1000,
  path: '/',
};

/** Checks the session token, then re-reads the account so disabled users and role changes take effect at once. */
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.[COOKIE] || req.headers.authorization?.replace(/^Bearer /, '');
  if (!token) return next(new HttpError(401, 'Please log in'));
  let payload: SessionUser;
  try {
    payload = jwt.verify(token, SECRET) as SessionUser;
  } catch {
    return next(new HttpError(401, 'Your session has expired. Please log in again.'));
  }
  try {
    const user = await prisma.user.findUnique({ where: { id: payload.id }, select: { id: true, name: true, role: true, active: true } });
    if (!user || !user.active) return next(new HttpError(401, 'This account is not active. Please contact the owner.'));
    req.user = { id: user.id, name: user.name, role: user.role };
    next();
  } catch (e) {
    next(e);
  }
}

/** Allows the request only if the user's role can open the module. */
export function requireModule(module: ModuleName) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new HttpError(401, 'Please log in');
      if (req.user.role === 'OWNER') return next();
      const allowed = await prisma.rolePermission.findUnique({
        where: { role_module: { role: req.user.role, module } },
      });
      if (!allowed) throw new HttpError(403, 'Your role cannot open this section');
      next();
    } catch (e) {
      next(e);
    }
  };
}

export async function allowedModules(role: Role): Promise<string[]> {
  if (role === 'OWNER') {
    const { MODULES } = await import('./modules');
    return [...MODULES];
  }
  const rows = await prisma.rolePermission.findMany({ where: { role } });
  return rows.map((r) => r.module);
}
