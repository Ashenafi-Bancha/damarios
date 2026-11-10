import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { OrderType, TrainingDept } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { ah, HttpError } from '../lib/http';
import { notifyTelegram } from '../lib/telegram';
import { imageUpload } from './uploads';

const r = Router();
const formLimiter = rateLimit({ windowMs: 10 * 60 * 1000, limit: 15, standardHeaders: true, legacyHeaders: false });
const uploadPath = z.string().regex(/^\/uploads\/[\w-]+\.(jpg|png|webp)$/);
const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal('')).transform((v) => v || undefined);

/** Everything the public website needs, in one call. */
r.get('/site', ah(async (req, res) => {
  const lang = typeof req.query.lang === 'string' ? req.query.lang : 'en';
  const [contentRows, products, courses, news, gallery, contact, opening] = await Promise.all([
    prisma.siteContent.findMany({ where: { lang: { in: [lang, 'en'] } } }),
    prisma.product.findMany({ where: { published: true }, orderBy: { sortOrder: 'asc' } }),
    prisma.course.findMany({ where: { published: true }, orderBy: [{ department: 'asc' }, { sortOrder: 'asc' }] }),
    prisma.newsPost.findMany({ where: { published: true }, orderBy: { date: 'desc' }, take: 6 }),
    prisma.galleryItem.findMany({ where: { published: true }, orderBy: { createdAt: 'desc' } }),
    prisma.setting.findUnique({ where: { key: 'contact' } }),
    prisma.setting.findUnique({ where: { key: 'openingDate' } }),
  ]);
  // Requested language wins; English fills the gaps.
  const content: Record<string, unknown> = {};
  for (const row of contentRows.filter((c) => c.lang === 'en')) content[row.section] = row;
  for (const row of contentRows.filter((c) => c.lang === lang && lang !== 'en')) content[row.section] = row;
  res.json({ content, products, courses, news, gallery, contact: contact?.value ?? null, openingDate: opening?.value ?? null });
}));

r.post('/uploads', formLimiter, imageUpload(5), (req, res) => {
  if (!req.file) throw new HttpError(400, 'No file received');
  res.status(201).json({ url: `/uploads/${req.file.filename}` });
});

/** Orders, wholesale and export enquiries. Buyers abroad may leave an email instead of a phone number. */
const requestSchema = z.object({
  type: z.nativeEnum(OrderType),
  name: z.string().trim().min(2).max(120),
  phone: optionalText(30),
  email: z.string().trim().email().max(120).optional().or(z.literal('')).transform((v) => v || undefined),
  telegram: optionalText(60),
  company: optionalText(120),
  country: optionalText(60),
  product: optionalText(60),
  quantity: optionalText(120),
  currency: z.enum(['ETB', 'USD']).optional(),
  neededBy: z.coerce.date().optional().or(z.literal('').transform(() => undefined)),
  budget: optionalText(60),
  message: z.string().max(3000).default(''),
  attachmentUrl: uploadPath.optional(),
}).refine((d) => (d.phone && d.phone.length >= 7) || d.email, { message: 'Please give a phone number or an email address', path: ['phone'] });

r.post('/requests', formLimiter, ah(async (req, res) => {
  const data = requestSchema.parse(req.body);
  const created = await prisma.request.create({ data: { ...data, phone: data.phone ?? '' } });
  const who = data.company ? `${data.company} (${data.name})` : data.name;
  notifyTelegram(`New ${data.type.replace(/_/g, ' ').toLowerCase()} request from ${who}${data.country ? `, ${data.country}` : ''}.`);
  res.status(201).json({ id: created.id });
}));

/** Training application from the website's admissions form. */
r.post('/training-applications', formLimiter, ah(async (req, res) => {
  const data = z.object({
    department: z.nativeEnum(TrainingDept),
    courseId: z.string().optional().or(z.literal('')).transform((v) => v || undefined),
    name: z.string().trim().min(2).max(120),
    phone: z.string().trim().min(7).max(30),
    preferredTime: optionalText(40),
    education: optionalText(60),
    age: z.coerce.number().int().min(10).max(90).optional().or(z.literal('').transform(() => undefined)),
    message: z.string().max(2000).default(''),
  }).parse(req.body);
  if (data.courseId) {
    const course = await prisma.course.findFirst({ where: { id: data.courseId, department: data.department, published: true } });
    if (!course) throw new HttpError(400, 'Please choose a course from the list');
  }
  const created = await prisma.trainingApplication.create({ data });
  notifyTelegram(`New training application (${data.department.toLowerCase()}) from ${data.name}.`);
  res.status(201).json({ id: created.id });
}));

r.post('/applications', formLimiter, ah(async (req, res) => {
  const data = z.object({
    jobId: z.string().optional(),
    name: z.string().trim().min(2).max(120),
    phone: z.string().trim().min(7).max(30),
    note: z.string().max(3000).default(''),
    attachmentUrl: uploadPath.optional(),
  }).parse(req.body);
  const created = await prisma.applicant.create({ data });
  notifyTelegram(`New job application from ${data.name}.`);
  res.status(201).json({ id: created.id });
}));

r.post('/subscribe', formLimiter, ah(async (req, res) => {
  const { contact } = z.object({ contact: z.string().trim().min(4).max(80) }).parse(req.body);
  await prisma.subscriber.upsert({ where: { contact }, update: {}, create: { contact } });
  res.status(201).json({ ok: true });
}));

export default r;
