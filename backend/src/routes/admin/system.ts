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
import { imageUploadRoute } from '../uploads';
import { email, imageUrl, strongPassword, nullableEmail, nullablePhone, nullableText, optionalDate, optionalPhone, text } from '../../lib/validate';

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
    prisma.event.findMany({ where: { date: { gte: today } }, orderBy: { date: 'asc' }, take: 3 }),
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
  model: 'customer', module: 'customers', orderBy: { createdAt: 'desc' }, search: ['name', 'phone', 'telegram', 'email'], filters: ['type'],
  include: { orders: { orderBy: { createdAt: 'desc' }, take: 10, include: { payments: true } } },
  schema: z.object({
    name: text(2, 120),
    type: z.nativeEnum(CustomerType).default('INDIVIDUAL'),
    phone: nullablePhone,
    telegram: nullableText(60),
    email: nullableEmail,
    measurements: z.record(z.string().max(40), z.string().max(60)).refine((m) => Object.keys(m).length <= 40, 'has too many entries').nullable().optional(),
    notes: z.string().max(3000).default(''),
  }),
}));

// ───── Website content ─────

const website = requireModule('website');

r.get('/content', website, ah(async (req, res) => {
  const lang = typeof req.query.lang === 'string' ? req.query.lang : 'en';
  res.json(await prisma.siteContent.findMany({ where: { lang }, orderBy: { section: 'asc' } }));
}));

r.put('/content/:section/:lang', website, ah(async (req, res) => {
  const { section, lang } = z.object({ section: z.string().regex(/^[a-z-]{2,40}$/), lang: z.enum(['en', 'am']) }).parse(req.params);
  const data = z.object({ headline: text(1, 200), body: z.string().max(5000).default(''), visible: z.boolean().default(true), data: z.record(z.unknown()).nullable().optional() }).parse(req.body);
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
    title: text(2, 160),
    kind: text(2, 40).default('News'),
    body: z.string().max(10000).default(''),
    date: optionalDate,
    imageUrl,
    published: z.boolean().default(true),
  }),
}));

r.get('/subscribers', website, ah(async (_req, res) => {
  res.json(await prisma.subscriber.findMany({ orderBy: { createdAt: 'desc' } }));
}));

// ───── Users, permissions & activity ─────

const users = requireModule('users');
const ownerOnly = (req: { user?: { role: Role } }) => {
  if (req.user?.role !== 'OWNER') throw new HttpError(403, 'Only the owner can manage accounts and permissions');
};
const publicUser = { id: true, name: true, email: true, phone: true, role: true, active: true, lastActiveAt: true, createdAt: true };

r.get('/users', users, ah(async (_req, res) => {
  res.json(await prisma.user.findMany({ select: publicUser, orderBy: { createdAt: 'asc' } }));
}));

r.post('/users', users, ah(async (req, res) => {
  ownerOnly(req);
  const data = z.object({ name: text(2, 120), email, phone: optionalPhone, role: z.nativeEnum(Role), password: strongPassword }).parse(req.body);
  const user = await prisma.user.create({
    data: { name: data.name, email: data.email, phone: data.phone, role: data.role, passwordHash: await bcrypt.hash(data.password, 12) },
    select: publicUser,
  });
  logActivity(req, `added user ${user.name} (${user.role.toLowerCase()})`, 'user', user.id);
  res.status(201).json(user);
}));

r.patch('/users/:id', users, ah(async (req, res) => {
  ownerOnly(req);
  const data = z.object({ name: text(2, 120), phone: nullablePhone, role: z.nativeEnum(Role), active: z.boolean(), password: strongPassword }).partial().parse(req.body);
  const target = await prisma.user.findUniqueOrThrow({ where: { id: req.params.id } });
  if (target.role === 'OWNER' && ((data.role && data.role !== 'OWNER') || data.active === false)) {
    const owners = await prisma.user.count({ where: { role: 'OWNER', active: true } });
    if (owners <= 1) throw new HttpError(400, 'There must always be at least one active owner');
  }
  const { password, ...rest } = data;
  // A new password, a role change or deactivation signs that person out everywhere.
  const endSessions = !!password || (data.role && data.role !== target.role) || data.active === false;
  const user = await prisma.user.update({
    where: { id: target.id },
    data: { ...rest, ...(password ? { passwordHash: await bcrypt.hash(password, 12) } : {}), ...(endSessions ? { sessionVersion: { increment: 1 } } : {}) },
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
  ownerOnly(req);
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

const urlOrEmpty = z.string().trim().max(400).refine((v) => v === '' || /^https:\/\/[^\s]+$/.test(v), 'must be a link starting with https://');
const SETTINGS = {
  business: z.object({
    name: text(2, 160), nameAm: z.string().max(160).default(''), tin: z.string().max(40).default(''), licence: z.string().max(60).default(''),
    startTime: z.string().regex(/^\d{1,2}:\d{2}$/, 'must look like 08:00').default('08:00'), workingDays: z.string().max(60).default(''),
  }),
  contact: z.object({
    phone: z.string().max(40).default(''), trainingPhone: z.string().max(40).default(''), whatsapp: z.string().max(40).default(''),
    email: z.string().max(120).default(''), telegram: z.string().max(60).default(''), address: z.string().max(200).default(''), hours: z.string().max(120).default(''),
    instagram: urlOrEmpty.default(''), tiktok: urlOrEmpty.default(''), facebook: urlOrEmpty.default(''), youtube: urlOrEmpty.default(''), mapUrl: urlOrEmpty.default(''),
  }),
  openingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'must be a date').nullable(),
  payroll: z.object({
    pensionEmployee: z.coerce.number().min(0).max(100), pensionEmployer: z.coerce.number().min(0).max(100),
    overtimeMultiplier: z.coerce.number().min(1).max(5).default(1.5),
    brackets: z.array(z.object({
      from: z.coerce.number().min(0), to: z.coerce.number().min(0).nullable(), rate: z.coerce.number().min(0).max(100), deduction: z.coerce.number().min(0),
    })).max(20),
  }),
  calendar: z.object({ main: z.enum(['ethiopian', 'gregorian']), showGregorian: z.boolean(), adminLanguage: z.enum(['en', 'am']).default('en') }),
  payments: z.object({ telebirr: z.string().max(60).default(''), cbeBirr: z.string().max(60).default(''), bank: z.string().max(200).default(''), depositPercent: z.coerce.number().min(0).max(100).default(50) }),
  notifications: z.record(z.boolean()),
} as const;
const SETTING_KEYS = Object.keys(SETTINGS) as (keyof typeof SETTINGS)[];

r.get('/settings', requireModule('settings'), ah(async (_req, res) => {
  const rows = await prisma.setting.findMany();
  res.json(Object.fromEntries(rows.map((s) => [s.key, s.value])));
}));

r.put('/settings/:key', requireModule('settings'), ah(async (req, res) => {
  const key = z.enum(SETTING_KEYS as [keyof typeof SETTINGS, ...(keyof typeof SETTINGS)[]]).parse(req.params.key);
  const value = SETTINGS[key].parse(req.body?.value);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = await prisma.setting.upsert({ where: { key }, update: { value: value as any }, create: { key, value: value as any } });
  logActivity(req, `changed settings: ${key}`, 'setting');
  res.json(row);
}));

// ───── Uploads (any signed-in user) ─────

r.post('/uploads', ...imageUploadRoute(8));

export default r;
