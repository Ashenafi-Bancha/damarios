import { Router } from 'express';
import { z } from 'zod';
import { DesignCategory, GalleryCategory } from '@prisma/client';
import { crud } from '../../lib/crud';
import { imageUrl, money, nullableText, requiredDate, text } from '../../lib/validate';

/** Garment designs, events (graduations, open days, market fairs) and the website gallery. */
const r = Router();

r.use('/designs', crud({
  model: 'design', module: 'fashion', orderBy: { code: 'asc' }, search: ['code', 'name'], filters: ['category'],
  schema: z.object({
    code: text(2, 30),
    name: text(2, 120),
    category: z.nativeEnum(DesignCategory).default('FASHION'),
    fabric: nullableText(120),
    notes: z.string().max(3000).default(''),
    imageUrl,
  }),
}));

r.use('/events', crud({
  model: 'event', module: 'fashion', orderBy: { date: 'asc' },
  schema: z.object({
    name: text(2, 120),
    date: requiredDate,
    venue: text(2, 120),
    description: z.string().max(3000).default(''),
    budget: money.default(0),
    spent: money.default(0),
    tasks: z.array(z.object({ label: text(1, 200), done: z.boolean() })).max(100).optional(),
    published: z.boolean().default(true),
  }),
}));

r.use('/gallery', crud({
  model: 'galleryItem', module: 'website', orderBy: { createdAt: 'desc' }, filters: ['category'],
  schema: z.object({
    title: text(1, 120),
    category: z.nativeEnum(GalleryCategory).default('GARMENTS'),
    imageUrl,
    tall: z.boolean().default(false),
    published: z.boolean().default(true),
  }),
}));

export default r;
