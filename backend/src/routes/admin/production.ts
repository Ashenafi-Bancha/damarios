import { Router } from 'express';
import { z } from 'zod';
import { Division, WorkStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ah } from '../../lib/http';
import { requireModule } from '../../lib/auth';
import { crud } from '../../lib/crud';
import { logActivity } from '../../lib/activity';

const r = Router();
const guard = requireModule('production');

r.get('/lines', guard, ah(async (_req, res) => {
  res.json(await prisma.productionLine.findMany({
    orderBy: { name: 'asc' },
    include: { workOrders: { where: { status: { not: 'DONE' } }, include: { order: { select: { code: true } } }, orderBy: { dueDate: 'asc' } } },
  }));
}));

const lineSchema = z.object({ name: z.string().min(2), division: z.nativeEnum(Division).default('GARMENT'), workers: z.coerce.number().int().min(0).default(0) });

r.post('/lines', guard, ah(async (req, res) => {
  res.status(201).json(await prisma.productionLine.create({ data: lineSchema.parse(req.body) }));
}));

r.patch('/lines/:id', guard, ah(async (req, res) => {
  res.json(await prisma.productionLine.update({ where: { id: req.params.id }, data: lineSchema.partial().parse(req.body) }));
}));

// Garment and spice products shown on the public website.
r.use('/products', crud({
  model: 'product', module: 'production', orderBy: { sortOrder: 'asc' }, filters: ['division'], search: ['name'],
  schema: z.object({
    name: z.string().min(2),
    division: z.nativeEnum(Division).default('GARMENT'),
    description: z.string().default(''),
    packSizes: z.string().default(''),
    markets: z.string().default(''),
    imageUrl: z.string().nullable().optional(),
    sortOrder: z.coerce.number().int().default(0),
    published: z.boolean().default(true),
  }),
}));

const workSchema = z.object({
  lineId: z.string(),
  orderId: z.string().nullable().optional(),
  title: z.string().min(2),
  unit: z.string().default('pcs'),
  target: z.coerce.number().int().positive(),
  dueDate: z.coerce.date().nullable().optional(),
  status: z.nativeEnum(WorkStatus).default('PLANNED'),
});

r.get('/work-orders', guard, ah(async (_req, res) => {
  res.json(await prisma.workOrder.findMany({ include: { line: true, order: { select: { code: true, title: true } } }, orderBy: { dueDate: 'asc' } }));
}));

r.post('/work-orders', guard, ah(async (req, res) => {
  const data = workSchema.parse(req.body);
  const wo = await prisma.workOrder.create({ data });
  if (data.orderId) await prisma.order.update({ where: { id: data.orderId }, data: { stage: 'IN_PRODUCTION', events: { create: { text: `Work order started on line` } } } });
  logActivity(req, `created work order ${wo.title}`, 'workOrder', wo.id);
  res.status(201).json(wo);
}));

r.patch('/work-orders/:id', guard, ah(async (req, res) => {
  res.json(await prisma.workOrder.update({ where: { id: req.params.id }, data: workSchema.partial().parse(req.body) }));
}));

/** Today's output entries, newest first. */
r.get('/output', guard, ah(async (_req, res) => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  res.json(await prisma.outputLog.findMany({
    where: { createdAt: { gte: start } },
    include: { employee: { select: { name: true, role: true } }, workOrder: { select: { title: true, order: { select: { code: true } } } } },
    orderBy: { createdAt: 'desc' },
  }));
}));

/** Records a worker's pieces for a shift and moves the work order forward. */
r.post('/output', guard, ah(async (req, res) => {
  const data = z.object({
    employeeId: z.string(),
    workOrderId: z.string(),
    pieces: z.coerce.number().int().min(0),
    defects: z.coerce.number().int().min(0).default(0),
  }).parse(req.body);
  const [log] = await prisma.$transaction([
    prisma.outputLog.create({ data }),
    prisma.workOrder.update({ where: { id: data.workOrderId }, data: { done: { increment: data.pieces } } }),
  ]);
  const wo = await prisma.workOrder.findUniqueOrThrow({ where: { id: data.workOrderId } });
  if (wo.done >= wo.target && wo.status !== 'DONE') {
    await prisma.workOrder.update({ where: { id: wo.id }, data: { status: 'DONE' } });
    if (wo.orderId) await prisma.order.update({ where: { id: wo.orderId }, data: { stage: 'QUALITY_CHECK', events: { create: { text: 'Production finished, sent to quality check' } } } });
  }
  logActivity(req, `recorded ${data.pieces} pieces`, 'workOrder', data.workOrderId);
  res.status(201).json(log);
}));

export default r;
