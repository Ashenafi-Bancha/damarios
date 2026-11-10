import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { ah, HttpError } from '../lib/http';
import { COOKIE, cookieOptions, requireAuth, signSession, allowedModules } from '../lib/auth';

const r = Router();

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false });

r.post('/login', loginLimiter, ah(async (req, res) => {
  const { email, password } = z.object({ email: z.string().email(), password: z.string().min(1) }).parse(req.body);
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user || !user.active || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new HttpError(401, 'Wrong email or password');
  }
  await prisma.user.update({ where: { id: user.id }, data: { lastActiveAt: new Date() } });
  const token = signSession({ id: user.id, name: user.name, role: user.role });
  res.cookie(COOKIE, token, cookieOptions);
  res.json({ id: user.id, name: user.name, role: user.role, modules: await allowedModules(user.role) });
}));

r.post('/logout', (_req, res) => {
  res.clearCookie(COOKIE, { path: '/' });
  res.status(204).end();
});

r.get('/me', requireAuth, ah(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user || !user.active) throw new HttpError(401, 'Please log in');
  res.json({ id: user.id, name: user.name, email: user.email, role: user.role, modules: await allowedModules(user.role) });
}));

export default r;
