import { Router } from 'express';
import { z } from 'zod';
import { TrainingDept } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { ah, HttpError } from '../lib/http';
import { notifyTelegram } from '../lib/telegram';
import { perVisitorLimit } from '../lib/limits';
import { imageUploadRoute } from './uploads';
import { isUploadedImageUrl } from '../lib/storage';
import { email, int, optionalEmail, optionalPhone, optionalText as text0, phone, text } from '../lib/validate';

const r = Router();
const formLimiter = perVisitorLimit(10, 15);
/** A photo address handed out by POST /uploads (local /uploads/… or the Spaces address). */
const uploadPath = z.string().max(300).refine(isUploadedImageUrl, 'Invalid attachment');
const optionalText = (max: number) => text0(max);

/** Order types the website's forms can send (the rest are only created by staff). */
const PUBLIC_ORDER_TYPES = ['WHOLESALE', 'EXPORT', 'CUSTOM_DESIGN', 'BESPOKE', 'CULTURAL', 'PRODUCTION'] as const;

/**
 * Spam bots fill in every field, including "website", which people never see (it is hidden on the page).
 * When it is filled the request is accepted but quietly not saved, so the bot learns nothing.
 */
const honeypot = { website: z.string().max(200).optional() };
const isBot = (body: unknown) => typeof (body as { website?: unknown })?.website === 'string' && (body as { website: string }).website.trim() !== '';

/** Everything the public website needs, in one call. */
r.get('/site', ah(async (req, res) => {
  const lang = req.query.lang === 'am' ? 'am' : 'en';
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

r.post('/uploads', formLimiter, ...imageUploadRoute(5));

/** Orders, wholesale and export enquiries. Buyers abroad may leave an email instead of a phone number. */
const requestSchema = z.object({
  ...honeypot,
  type: z.enum(PUBLIC_ORDER_TYPES),
  name: text(2, 120),
  phone: optionalPhone,
  email: optionalEmail,
  telegram: optionalText(60),
  company: optionalText(120),
  country: optionalText(60),
  product: optionalText(60),
  quantity: optionalText(120),
  currency: z.enum(['ETB', 'USD']).optional(),
  neededBy: z.preprocess((v) => (v === '' || v === null ? undefined : v), z.coerce.date().optional()).refine((d) => !d || d.getTime() > Date.now() - 86400000, 'must be today or later'),
  budget: optionalText(60),
  message: z.string().max(3000).default(''),
  attachmentUrl: uploadPath.optional(),
}).refine((d) => d.phone || d.email, { message: 'Please give a phone number or an email address so we can reply', path: ['phone'] });

r.post('/requests', formLimiter, ah(async (req, res) => {
  if (isBot(req.body)) return res.status(201).json({ id: 'ok' });
  const { website: _hp, ...data } = requestSchema.parse(req.body);
  const created = await prisma.request.create({ data: { ...data, phone: data.phone ?? '' } });
  const who = data.company ? `${data.company} (${data.name})` : data.name;
  notifyTelegram('newRequest', `New ${data.type.replace(/_/g, ' ').toLowerCase()} request from ${who}${data.country ? `, ${data.country}` : ''}.`);
  res.status(201).json({ id: created.id });
}));

/** Training application from the website's admissions form. */
r.post('/training-applications', formLimiter, ah(async (req, res) => {
  if (isBot(req.body)) return res.status(201).json({ id: 'ok' });
  const { website: _hp, ...data } = z.object({
    ...honeypot,
    department: z.nativeEnum(TrainingDept),
    courseId: optionalText(40),
    name: text(2, 120),
    phone,
    preferredTime: optionalText(40),
    education: optionalText(60),
    age: z.preprocess((v) => (v === '' || v === null ? undefined : v), int(10, 90).optional()),
    message: z.string().max(2000).default(''),
  }).parse(req.body);
  if (data.courseId) {
    const course = await prisma.course.findFirst({ where: { id: data.courseId, department: data.department, published: true } });
    if (!course) throw new HttpError(400, 'Please choose a course from the list');
  }
  const created = await prisma.trainingApplication.create({ data });
  notifyTelegram('newApplication', `New training application (${data.department.toLowerCase()}) from ${data.name}.`);
  res.status(201).json({ id: created.id });
}));

r.post('/applications', formLimiter, ah(async (req, res) => {
  if (isBot(req.body)) return res.status(201).json({ id: 'ok' });
  const { website: _hp, ...data } = z.object({
    ...honeypot,
    jobId: optionalText(40),
    name: text(2, 120),
    phone,
    note: z.string().max(3000).default(''),
    attachmentUrl: uploadPath.optional(),
  }).parse(req.body);
  if (data.jobId && !(await prisma.job.findFirst({ where: { id: data.jobId, published: true } }))) {
    throw new HttpError(400, 'This job is no longer open');
  }
  const created = await prisma.applicant.create({ data });
  notifyTelegram('newApplication', `New job application from ${data.name}.`);
  res.status(201).json({ id: created.id });
}));

r.post('/subscribe', formLimiter, ah(async (req, res) => {
  if (isBot(req.body)) return res.status(201).json({ ok: true });
  // A phone number, an email address or a Telegram username (@name).
  const { contact } = z.object({
    ...honeypot,
    contact: z.string().trim().max(80).refine(
      (v) => email.safeParse(v).success || phone.safeParse(v).success || /^@?[A-Za-z][A-Za-z0-9_]{4,31}$/.test(v),
      'enter a phone number, an email address or a Telegram @username',
    ),
  }).parse(req.body);
  await prisma.subscriber.upsert({ where: { contact }, update: {}, create: { contact } });
  res.status(201).json({ ok: true });
}));

export default r;
