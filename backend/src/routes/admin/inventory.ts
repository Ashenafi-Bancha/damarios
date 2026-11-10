import { Router } from 'express';
import { z } from 'zod';
import { Direction, StockCategory } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ah, HttpError } from '../../lib/http';
import { requireModule } from '../../lib/auth';
import { crud } from '../../lib/crud';
import { logActivity } from '../../lib/activity';

const r = Router();
const guard = requireModule('inventory');

r.use('/suppliers', crud({
  model: 'supplier', module: 'inventory', orderBy: { name: 'asc' }, search: ['name', 'supplies'],
  schema: z.object({ name: z.string().min(2), location: z.string().nullable().optional(), phone: z.string().nullable().optional(), supplies: z.string().default('') }),
}));

r.use('/items', crud({
  model: 'inventoryItem', module: 'inventory', orderBy: { name: 'asc' }, include: { supplier: true }, search: ['name'], filters: ['category'],
  schema: z.object({
    name: z.string().min(2),
    category: z.nativeEnum(StockCategory).default('FABRIC'),
    unit: z.string().default('pcs'),
    quantity: z.coerce.number().min(0).default(0),
    minLevel: z.coerce.number().min(0).default(0),
    unitCost: z.coerce.number().min(0).default(0),
    supplierId: z.string().nullable().optional(),
  }),
}));

r.get('/movements', guard, ah(async (_req, res) => {
  res.json(await prisma.stockMovement.findMany({ include: { item: { select: { name: true, unit: true } } }, orderBy: { createdAt: 'desc' }, take: 100 }));
}));

/** Stock in or out. Quantity on hand changes in the same transaction. */
r.post('/movements', guard, ah(async (req, res) => {
  const data = z.object({
    itemId: z.string(),
    direction: z.nativeEnum(Direction),
    quantity: z.coerce.number().positive(),
    reference: z.string().optional(),
  }).parse(req.body);
  const item = await prisma.inventoryItem.findUniqueOrThrow({ where: { id: data.itemId } });
  if (data.direction === 'OUT' && Number(item.quantity) < data.quantity) {
    throw new HttpError(400, `Only ${item.quantity} ${item.unit} of ${item.name} in stock`);
  }
  const [movement] = await prisma.$transaction([
    prisma.stockMovement.create({ data }),
    prisma.inventoryItem.update({
      where: { id: item.id },
      data: { quantity: data.direction === 'IN' ? { increment: data.quantity } : { decrement: data.quantity } },
    }),
  ]);
  logActivity(req, `recorded stock ${data.direction === 'IN' ? 'in' : 'out'}: ${data.quantity} ${item.unit} ${item.name}`, 'inventoryItem', item.id);
  res.status(201).json(movement);
}));

r.get('/low', guard, ah(async (_req, res) => {
  const items = await prisma.inventoryItem.findMany({ include: { supplier: true } });
  res.json(items.filter((i) => Number(i.quantity) < Number(i.minLevel)));
}));

export default r;
