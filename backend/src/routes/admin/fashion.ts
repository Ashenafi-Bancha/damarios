import { Router } from 'express';
import { z } from 'zod';
import { DesignCategory, GalleryCategory, LookCategory, PayStatus } from '@prisma/client';
import { crud } from '../../lib/crud';

/** Designs, collections, looks, models, bookings, events and gallery. */
const r = Router();
const img = z.string().nullable().optional();

r.use('/designs', crud({
  model: 'design', module: 'fashion', orderBy: { code: 'asc' }, search: ['code', 'name'], filters: ['category'],
  schema: z.object({ code: z.string().min(2), name: z.string().min(2), category: z.nativeEnum(DesignCategory).default('FASHION'), fabric: z.string().nullable().optional(), notes: z.string().default(''), imageUrl: img }),
}));

r.use('/collections', crud({
  model: 'collection', module: 'fashion', orderBy: { createdAt: 'desc' }, include: { looks: true }, search: ['name'],
  schema: z.object({
    name: z.string().min(2),
    slug: z.string().regex(/^[a-z0-9-]+$/, 'Use lowercase letters, numbers and dashes'),
    season: z.string().nullable().optional(),
    description: z.string().default(''),
    coverUrl: img,
    featured: z.boolean().default(false),
    published: z.boolean().default(true),
  }),
}));

r.use('/looks', crud({
  model: 'look', module: 'fashion', orderBy: { sortOrder: 'asc' }, filters: ['category', 'collectionId'],
  schema: z.object({ name: z.string().min(1), collectionId: z.string().nullable().optional(), category: z.nativeEnum(LookCategory).default('READY_TO_WEAR'), imageUrl: img, sortOrder: z.coerce.number().int().default(0), published: z.boolean().default(true) }),
}));

r.use('/models', crud({
  model: 'fashionModel', module: 'fashion', orderBy: { createdAt: 'asc' }, search: ['name', 'specialties'], filters: ['available'],
  schema: z.object({ name: z.string().min(2), info: z.string().default(''), heightCm: z.coerce.number().int().nullable().optional(), specialties: z.string().default(''), available: z.boolean().default(true), imageUrl: img, published: z.boolean().default(true) }),
}));

r.use('/bookings', crud({
  model: 'modelBooking', module: 'fashion', orderBy: { date: 'asc' },
  schema: z.object({ client: z.string().min(2), kind: z.string().min(2), date: z.coerce.date(), modelsCount: z.coerce.number().int().min(1).default(1), fee: z.coerce.number().min(0).default(0), payStatus: z.nativeEnum(PayStatus).default('UNPAID'), notes: z.string().default('') }),
}));

r.use('/events', crud({
  model: 'fashionEvent', module: 'fashion', orderBy: { date: 'asc' },
  schema: z.object({
    name: z.string().min(2),
    date: z.coerce.date(),
    venue: z.string().min(2),
    description: z.string().default(''),
    budget: z.coerce.number().min(0).default(0),
    spent: z.coerce.number().min(0).default(0),
    tasks: z.array(z.object({ label: z.string(), done: z.boolean() })).optional(),
    published: z.boolean().default(true),
  }),
}));

r.use('/gallery', crud({
  model: 'galleryItem', module: 'website', orderBy: { createdAt: 'desc' }, filters: ['category'],
  schema: z.object({ title: z.string().min(1), category: z.nativeEnum(GalleryCategory).default('GARMENTS'), imageUrl: img, tall: z.boolean().default(false), published: z.boolean().default(true) }),
}));

export default r;
