import { Router } from 'express';
import { z } from 'zod';
import { Division, WorkStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ah, HttpError } from '../../lib/http';
import { requireModule } from '../../lib/auth';
import { crud } from '../../lib/crud';
import { logActivity } from '../../lib/activity';
import { id, imageUrl, int, nullableDate, nullableId, text } from '../../lib/validate';

const r = Router();
const guard = requireModule('production');

r.get('/lines', guard, ah(async (_req, res) => {
  res.json(await prisma.productionLine.findMany({
    orderBy: { name: 'asc' },
    include: { workOrders: { where: { status: { not: 'DONE' } }, include: { order: { select: { code: true } } }, orderBy: { dueDate: 'asc' } } },
  }));
}));

const lineSchema = z.object({ name: text(2, 80), division: z.nativeEnum(Division).default('GARMENT'), workers: int(0, 10_000).default(0) });

r.post('/lines', guard, ah(async (req, res) => {
  const line = await prisma.productionLine.create({ data: lineSchema.parse(req.body) });
  logActivity(req, `added production line ${line.name}`, 'productionLine', line.id);
  res.status(201).json(line);
}));

r.patch('/lines/:id', guard, ah(async (req, res) => {
  const line = await prisma.productionLine.update({ where: { id: req.params.id }, data: lineSchema.partial().parse(req.body) });
  logActivity(req, `updated production line ${line.name}`, 'productionLine', line.id);
  res.json(line);
}));

// Garment and spice products shown on the public website.
r.use('/products', crud({
  model: 'product', module: 'production', orderBy: { sortOrder: 'asc' }, filters: ['division'], search: ['name'],
  schema: z.object({
    name: text(2, 120),
    division: z.nativeEnum(Division).default('GARMENT'),
    description: z.string().max(2000).default(''),
    packSizes: z.string().max(200).default(''),
    markets: z.string().max(200).default(''),
    imageUrl,
    sortOrder: int(-10_000, 10_000).default(0),
    published: z.boolean().default(true),
  }),
}));

const workSchema = z.object({
  lineId: id,
  orderId: nullableId,
  title: text(2, 160),
  unit: text(1, 20).default('pcs'),
  target: int(1, 10_000_000),
  dueDate: nullableDate,
  status: z.nativeEnum(WorkStatus).default('PLANNED'),
});

r.get('/work-orders', guard, ah(async (_req, res) => {
  res.json(await prisma.workOrder.findMany({ include: { line: true, order: { select: { code: true, title: true } } }, orderBy: [{ status: 'asc' }, { dueDate: 'asc' }], take: 500 }));
}));

r.post('/work-orders', guard, ah(async (req, res) => {
  const data = workSchema.parse(req.body);
  const wo = await prisma.$transaction(async (tx) => {
    const line = await tx.productionLine.findUnique({ where: { id: data.lineId } });
    if (!line) throw new HttpError(400, 'Choose a production line');
    const created = await tx.workOrder.create({ data });
    if (data.orderId) {
      const order = await tx.order.findUnique({ where: { id: data.orderId } });
      if (!order || order.stage === 'CANCELLED') throw new HttpError(400, 'The linked order is cancelled or no longer exists');
      // An order that hasn't reached production yet moves to In production; later stages are left alone.
      if (['NEW', 'QUOTED', 'SAMPLE'].includes(order.stage)) {
        await tx.order.update({ where: { id: order.id }, data: { stage: 'IN_PRODUCTION', events: { create: { text: `Production started on ${line.name}: ${created.title}` } } } });
      }
    }
    return created;
  });
  logActivity(req, `created work order ${wo.title}`, 'workOrder', wo.id);
  res.status(201).json(wo);
}));

r.patch('/work-orders/:id', guard, ah(async (req, res) => {
  const wo = await prisma.workOrder.update({ where: { id: req.params.id }, data: workSchema.partial().parse(req.body) });
  logActivity(req, `updated work order ${wo.title}`, 'workOrder', wo.id);
  res.json(wo);
}));

/** Today's output entries, newest first. */
r.get('/output', guard, ah(async (_req, res) => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  res.json(await prisma.outputLog.findMany({
    where: { createdAt: { gte: start } },
    include: { employee: { select: { name: true, role: true } }, workOrder: { select: { title: true, unit: true, order: { select: { code: true } } } } },
    orderBy: { createdAt: 'desc' },
  }));
}));

/** Records a worker's output for a shift and moves the work order forward, all in one transaction. */
r.post('/output', guard, ah(async (req, res) => {
  const data = z.object({
    employeeId: id,
    workOrderId: id,
    pieces: int(1, 1_000_000),
    defects: int(0, 1_000_000).default(0),
  }).parse(req.body);
  if (data.defects > data.pieces) throw new HttpError(400, 'Defects can’t be more than the pieces made');

  const log = await prisma.$transaction(async (tx) => {
    const employee = await tx.employee.findUnique({ where: { id: data.employeeId } });
    if (!employee || !employee.active) throw new HttpError(400, 'Choose an active employee');
    const before = await tx.workOrder.findUnique({ where: { id: data.workOrderId } });
    if (!before) throw new HttpError(400, 'Choose a work order');
    if (before.status === 'DONE') throw new HttpError(400, 'This work order is already finished');

    const created = await tx.outputLog.create({ data });
    // Good pieces count towards the target; defective ones are recorded but don't.
    const wo = await tx.workOrder.update({ where: { id: before.id }, data: { done: { increment: data.pieces - data.defects }, status: before.status === 'PLANNED' ? 'ON_TRACK' : undefined } });
    if (wo.done >= wo.target) {
      await tx.workOrder.update({ where: { id: wo.id }, data: { status: 'DONE' } });
      if (wo.orderId) {
        const order = await tx.order.findUnique({ where: { id: wo.orderId } });
        const open = await tx.workOrder.count({ where: { orderId: wo.orderId, status: { not: 'DONE' } } });
        // The order goes to quality check when its last work order is finished.
        if (order && order.stage === 'IN_PRODUCTION' && open === 0) {
          await tx.order.update({ where: { id: order.id }, data: { stage: 'QUALITY_CHECK', events: { create: { text: 'Production finished, sent to quality check' } } } });
        }
      }
    }
    return created;
  });
  logActivity(req, `recorded ${data.pieces} pieces${data.defects ? ` (${data.defects} defective)` : ''}`, 'workOrder', data.workOrderId);
  res.status(201).json(log);
}));

export default r;
