import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { CustomerType, Prisma, Role } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ah, HttpError } from '../../lib/http';
import { requireModule } from '../../lib/auth';
import { crud } from '../../lib/crud';
import { logActivity } from '../../lib/activity';
import { MODULES } from '../../lib/modules';
import { etPeriod } from '../../lib/ethiopian';
import { imageUpload } from '../uploads';

/** Dashboard, customers, website content, users, permissions, settings and uploads. */
const r = Router();

// ───── Dashboard ─────

r.get('/dashboard', requireModule('dashboard'), ah(async (_req, res) => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayUtc = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  const weekEnd = new Date(today.getTime() + 7 * 86400000);
  const yesterday = new Date(today.getTime() - 86400000);
  const [stages, newToday, dueSoon, newRequests, activeStaff, attendance, items, lines, events, classesSoon, txs, newApplications, students] = await Promise.all([
    prisma.order.groupBy({ by: ['stage'], where: { stage: { notIn: ['CANCELLED', 'DELIVERED'] } }, _count: true }),
    prisma.order.count({ where: { createdAt: { gte: yesterday } } }),
    prisma.order.count({ where: { dueDate: { gte: today, lte: weekEnd }, stage: { notIn: ['DELIVERED', 'CANCELLED'] } } }),
    prisma.request.findMany({ where: { status: 'NEW' }, orderBy: { createdAt: 'desc' }, take: 6 }),
    prisma.employee.count({ where: { active: true } }),
    prisma.attendance.groupBy({ by: ['status'], where: { date: todayUtc }, _count: true }),
    prisma.inventoryItem.findMany(),
    prisma.productionLine.findMany({ include: { workOrders: { where: { status: { not: 'DONE' } } } } }),
    prisma.fashionEvent.findMany({ where: { date: { gte: today } }, orderBy: { date: 'asc' }, take: 3 }),
    prisma.trainingClass.findMany({ where: { startDate: { gte: today } }, include: { course: true }, orderBy: { startDate: 'asc' }, take: 3 }),
    prisma.transaction.findMany({ where: { date: { gte: new Date(today.getTime() - 30 * 86400000) } } }),
    prisma.trainingApplication.count({ where: { status: 'NEW' } }),
    prisma.enrollment.count({ where: { status: 'ENROLLED' } }),
  ]);
  const count = (s: string) => stages.find((x) => x.stage === s)?._count ?? 0;
  const att = (s: string) => attendance.find((x) => x.status === s)?._count ?? 0;
  const low = items.filter((i) => Number(i.quantity) < Number(i.minLevel));
  const income = txs.filter((t) => t.kind === 'INCOME').reduce((s, t) => s + Number(t.amount), 0);
  const expense = txs.filter((t) => t.kind === 'EXPENSE').reduce((s, t) => s + Number(t.amount), 0);
  res.json({
    period: etPeriod(),
    kpis: {
      newOrders: count('NEW'), newToday, inProduction: count('IN_PRODUCTION'), dueThisWeek: dueSoon,
      present: att('PRESENT') + att('LATE'), late: att('LATE'), staff: activeStaff, lowStock: low.length, income30: income, expense30: expense,
      students, newApplications,
    },
    stages: ['NEW', 'QUOTED', 'SAMPLE', 'IN_PRODUCTION', 'QUALITY_CHECK', 'READY'].map((s) => ({ stage: s, count: count(s) })),
    requests: newRequests,
    production: lines.map((l) => {
      const target = l.workOrders.reduce((s, w) => s + w.target, 0);
      const done = l.workOrders.reduce((s, w) => s + w.done, 0);
      return { id: l.id, name: l.name, division: l.division, unit: l.workOrders[0]?.unit ?? (l.division === 'SPICE' ? 'kg' : 'pcs'), target, done };
    }),
    lowStock: low.slice(0, 5),
    attendance: { present: att('PRESENT'), late: att('LATE'), absent: att('ABSENT') + att('LEAVE'), total: activeStaff },
    upcoming: [
      ...events.map((e) => ({ date: e.date, title: e.name, sub: e.venue, kind: 'event' })),
      ...classesSoon.map((c) => ({ date: c.startDate!, title: `Class starts · ${c.course.name}`, sub: `${c.name}${c.instructor ? ` · ${c.instructor}` : ''}`, kind: 'class' })),
    ].sort((a, b) => +new Date(a.date) - +new Date(b.date)).slice(0, 5),
  });
}));

// ───── Customers ─────

r.use('/customers', crud({
  model: 'customer', module: 'customers', orderBy: { createdAt: 'desc' }, search: ['name', 'phone', 'telegram'], filters: ['type'],
  include: { orders: { orderBy: { createdAt: 'desc' }, take: 10, include: { payments: true } } },
  schema: z.object({
    name: z.string().min(2),
    type: z.nativeEnum(CustomerType).default('INDIVIDUAL'),
    phone: z.string().nullable().optional(),
    telegram: z.string().nullable().optional(),
    email: z.string().email().nullable().optional().or(z.literal('')),
    measurements: z.record(z.string()).nullable().optional(),
    notes: z.string().default(''),
  }),
}));

// ───── Website content ─────

const website = requireModule('website');

r.get('/content', website, ah(async (req, res) => {
  const lang = typeof req.query.lang === 'string' ? req.query.lang : 'en';
  res.json(await prisma.siteContent.findMany({ where: { lang }, orderBy: { section: 'asc' } }));
}));

r.put('/content/:section/:lang', website, ah(async (req, res) => {
  const { section, lang } = z.object({ section: z.string().regex(/^[a-z-]+$/), lang: z.enum(['en', 'am', 'wal']) }).parse(req.params);
  const data = z.object({ headline: z.string(), body: z.string().default(''), visible: z.boolean().default(true), data: z.record(z.unknown()).nullable().optional() }).parse(req.body);
  const json = (data.data ?? undefined) as Prisma.InputJsonValue | undefined;
  const row = await prisma.siteContent.upsert({
    where: { section_lang: { section, lang } },
    update: { ...data, data: json },
    create: { section, lang, ...data, data: json },
  });
  logActivity(req, `updated website section "${section}" (${lang})`, 'content', row.id);
  res.json(row);
}));

r.use('/news', crud({
  model: 'newsPost', module: 'website', orderBy: { date: 'desc' }, search: ['title'],
  schema: z.object({
    title: z.string().min(2),
    kind: z.string().default('News'),
    body: z.string().default(''),
    date: z.coerce.date().optional(),
    imageUrl: z.string().nullable().optional(),
    published: z.boolean().default(true),
  }),
}));

r.get('/subscribers', website, ah(async (_req, res) => {
  res.json(await prisma.subscriber.findMany({ orderBy: { createdAt: 'desc' } }));
}));

// ───── Users, permissions & activity ─────

const users = requireModule('users');
const publicUser = { id: true, name: true, email: true, phone: true, role: true, active: true, lastActiveAt: true, createdAt: true };

r.get('/users', users, ah(async (_req, res) => {
  res.json(await prisma.user.findMany({ select: publicUser, orderBy: { createdAt: 'asc' } }));
}));

r.post('/users', users, ah(async (req, res) => {
  const data = z.object({ name: z.string().min(2), email: z.string().email(), phone: z.string().optional(), role: z.nativeEnum(Role), password: z.string().min(8) }).parse(req.body);
  if (data.role === 'OWNER' && req.user!.role !== 'OWNER') throw new HttpError(403, 'Only the owner can add another owner');
  const user = await prisma.user.create({
    data: { name: data.name, email: data.email.toLowerCase(), phone: data.phone, role: data.role, passwordHash: await bcrypt.hash(data.password, 12) },
    select: publicUser,
  });
  logActivity(req, `added user ${user.name} (${user.role.toLowerCase()})`, 'user', user.id);
  res.status(201).json(user);
}));

r.patch('/users/:id', users, ah(async (req, res) => {
  const data = z.object({ name: z.string().min(2), phone: z.string(), role: z.nativeEnum(Role), active: z.boolean(), password: z.string().min(8) }).partial().parse(req.body);
  const target = await prisma.user.findUniqueOrThrow({ where: { id: req.params.id } });
  if ((target.role === 'OWNER' || data.role === 'OWNER') && req.user!.role !== 'OWNER') throw new HttpError(403, 'Only the owner can change an owner account');
  if (target.role === 'OWNER' && (data.role && data.role !== 'OWNER' || data.active === false)) {
    const owners = await prisma.user.count({ where: { role: 'OWNER', active: true } });
    if (owners <= 1) throw new HttpError(400, 'There must always be at least one active owner');
  }
  const { password, ...rest } = data;
  const user = await prisma.user.update({
    where: { id: target.id },
    data: { ...rest, ...(password ? { passwordHash: await bcrypt.hash(password, 12) } : {}) },
    select: publicUser,
  });
  logActivity(req, `updated user ${user.name}`, 'user', user.id);
  res.json(user);
}));

r.get('/permissions', users, ah(async (_req, res) => {
  const rows = await prisma.rolePermission.findMany();
  res.json({ modules: MODULES, roles: Object.values(Role).filter((x) => x !== 'OWNER'), granted: rows.map((x) => `${x.role}|${x.module}`) });
}));

r.put('/permissions', users, ah(async (req, res) => {
  const { role, module, allowed } = z.object({ role: z.nativeEnum(Role).refine((x) => x !== 'OWNER'), module: z.enum(MODULES), allowed: z.boolean() }).parse(req.body);
  if (allowed) await prisma.rolePermission.upsert({ where: { role_module: { role, module } }, update: {}, create: { role, module } });
  else await prisma.rolePermission.deleteMany({ where: { role, module } });
  logActivity(req, `${allowed ? 'gave' : 'removed'} ${module} access for ${role.toLowerCase()}`, 'permission');
  res.json({ ok: true });
}));

r.get('/activity', users, ah(async (_req, res) => {
  res.json(await prisma.activityLog.findMany({ include: { user: { select: { name: true, role: true } } }, orderBy: { createdAt: 'desc' }, take: 100 }));
}));

// ───── Settings ─────

const SETTING_KEYS = ['business', 'contact', 'openingDate', 'payroll', 'calendar', 'payments', 'notifications'] as const;

r.get('/settings', requireModule('settings'), ah(async (_req, res) => {
  const rows = await prisma.setting.findMany();
  res.json(Object.fromEntries(rows.map((s) => [s.key, s.value])));
}));

r.put('/settings/:key', requireModule('settings'), ah(async (req, res) => {
  const key = z.enum(SETTING_KEYS).parse(req.params.key);
  const value = z.unknown().parse(req.body?.value);
  if (value === undefined) throw new HttpError(400, 'Missing value');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = await prisma.setting.upsert({ where: { key }, update: { value: value as any }, create: { key, value: value as any } });
  logActivity(req, `changed settings: ${key}`, 'setting');
  res.json(row);
}));

// ───── Uploads (any signed-in user) ─────

r.post('/uploads', imageUpload(8), (req, res) => {
  if (!req.file) throw new HttpError(400, 'No file received');
  res.status(201).json({ url: `/uploads/${req.file.filename}` });
});

export default r;
