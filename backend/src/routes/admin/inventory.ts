import { Router } from 'express';
import { z } from 'zod';
import { Direction, StockCategory } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ah, HttpError } from '../../lib/http';
import { requireModule } from '../../lib/auth';
import { crud } from '../../lib/crud';
import { logActivity } from '../../lib/activity';
import { notifyTelegram } from '../../lib/telegram';
import { id, money, nullablePhone, nullableId, nullableText, optionalText, text } from '../../lib/validate';

const r = Router();
const guard = requireModule('inventory');

/** Stock quantities: not negative, two decimals (e.g. 12.5 kg). */
const qty = z.coerce.number().min(0, 'cannot be negative').max(100_000_000, 'is too large');

r.use('/suppliers', crud({
  model: 'supplier', module: 'inventory', orderBy: { name: 'asc' }, search: ['name', 'supplies'],
  schema: z.object({ name: text(2, 120), location: nullableText(120), phone: nullablePhone, supplies: z.string().max(500).default('') }),
}));

// Quantity on hand is set when an item is added; after that it changes only through stock in / out below,
// so every change is in the movement history.
r.use('/items', crud({
  model: 'inventoryItem', module: 'inventory', orderBy: { name: 'asc' }, include: { supplier: true }, search: ['name'], filters: ['category'],
  schema: z.object({
    name: text(2, 120),
    category: z.nativeEnum(StockCategory).default('FABRIC'),
    unit: text(1, 20).default('pcs'),
    quantity: qty.default(0),
    minLevel: qty.default(0),
    unitCost: money.default(0),
    supplierId: nullableId,
  }),
  updateSchema: (s) => s.omit({ quantity: true }).partial(),
}));

r.get('/movements', guard, ah(async (_req, res) => {
  res.json(await prisma.stockMovement.findMany({ include: { item: { select: { name: true, unit: true } } }, orderBy: { createdAt: 'desc' }, take: 100 }));
}));

/** Stock in or out. Stock out only succeeds if enough is on hand at that moment (checked in the same write). */
r.post('/movements', guard, ah(async (req, res) => {
  const data = z.object({
    itemId: id,
    direction: z.nativeEnum(Direction),
    quantity: qty.refine((n) => n > 0, 'must be more than 0'),
    reference: optionalText(200),
  }).parse(req.body);

  const { movement, item, left } = await prisma.$transaction(async (tx) => {
    const item = await tx.inventoryItem.findUnique({ where: { id: data.itemId } });
    if (!item) throw new HttpError(400, 'Choose an item');
    if (data.direction === 'OUT') {
      const taken = await tx.inventoryItem.updateMany({ where: { id: item.id, quantity: { gte: data.quantity } }, data: { quantity: { decrement: data.quantity } } });
      if (taken.count === 0) throw new HttpError(400, `Only ${Number(item.quantity)} ${item.unit} of ${item.name} in stock`);
    } else {
      await tx.inventoryItem.update({ where: { id: item.id }, data: { quantity: { increment: data.quantity } } });
    }
    const movement = await tx.stockMovement.create({ data });
    const after = await tx.inventoryItem.findUniqueOrThrow({ where: { id: item.id }, select: { quantity: true } });
    return { movement, item, left: Number(after.quantity) };
  });
  // Alert once, when this movement takes the item below its minimum level.
  if (data.direction === 'OUT' && left < Number(item.minLevel) && Number(item.quantity) >= Number(item.minLevel)) {
    notifyTelegram('lowStock', `Low stock: ${item.name} is down to ${left} ${item.unit} (minimum ${Number(item.minLevel)}).`);
  }
  logActivity(req, `recorded stock ${data.direction === 'IN' ? 'in' : 'out'}: ${data.quantity} ${item.unit} ${item.name}`, 'inventoryItem', item.id);
  res.status(201).json(movement);
}));

r.get('/low', guard, ah(async (_req, res) => {
  const items = await prisma.inventoryItem.findMany({ include: { supplier: true } });
  res.json(items.filter((i) => Number(i.quantity) < Number(i.minLevel)));
}));

export default r;
