import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { ah, HttpError } from '../lib/http';
import { perVisitorLimit } from '../lib/limits';
import { logActivity } from '../lib/activity';
import { strongPassword } from '../lib/validate';

/** Used when the email is unknown, so a wrong email takes as long as a wrong password (no account guessing by timing). */
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12);
import { COOKIE, cookieOptions, requireAuth, signSession, allowedModules } from '../lib/auth';

const r = Router();

const loginLimiter = perVisitorLimit(15, 20);

r.post('/login', loginLimiter, ah(async (req, res) => {
  const { email, password } = z.object({ email: z.string().trim().toLowerCase().email('enter a valid email address').max(120), password: z.string().min(1, 'is required').max(200) }).parse(req.body);
  const user = await prisma.user.findUnique({ where: { email } });
  const matches = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !matches) throw new HttpError(401, 'Wrong email or password');
  if (!user.active) throw new HttpError(401, 'This account is not active. Please contact the owner.');
  await prisma.user.update({ where: { id: user.id }, data: { lastActiveAt: new Date() } });
  const token = signSession(user);
  res.cookie(COOKIE, token, cookieOptions);
  res.json({ id: user.id, name: user.name, role: user.role, modules: await allowedModules(user.role) });
}));

r.post('/logout', (_req, res) => {
  // Same options as when it was set (minus its lifetime), so browsers really remove it.
  const { maxAge: _maxAge, ...clearOptions } = cookieOptions;
  res.clearCookie(COOKIE, clearOptions);
  res.status(204).end();
});

/** Any signed-in person can change their own password (the current one is required). Other sessions are signed out. */
r.post('/password', loginLimiter, requireAuth, ah(async (req, res) => {
  const { current, password } = z.object({ current: z.string().min(1, 'is required').max(200), password: strongPassword }).parse(req.body);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });
  if (!(await bcrypt.compare(current, user.passwordHash))) throw new HttpError(400, 'Your current password is not correct');
  if (current === password) throw new HttpError(400, 'Choose a password different from the current one');
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(password, 12), sessionVersion: { increment: 1 } },
  });
  // Keep this browser signed in with a fresh token; every other session ends.
  res.cookie(COOKIE, signSession(updated), cookieOptions);
  logActivity(req, 'changed their password', 'user', user.id);
  res.json({ ok: true });
}));

r.get('/me', requireAuth, ah(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user || !user.active) throw new HttpError(401, 'Please log in');
  res.json({ id: user.id, name: user.name, email: user.email, role: user.role, modules: await allowedModules(user.role) });
}));

export default r;
