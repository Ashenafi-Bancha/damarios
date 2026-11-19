import { Router } from 'express';
import { z } from 'zod';
import { OrderStage, OrderType, PayMethod, RequestStatus, CustomerType } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ah, HttpError } from '../../lib/http';
import { requireModule } from '../../lib/auth';
import { logActivity } from '../../lib/activity';
import { notifyTelegram } from '../../lib/telegram';
import { ORDER_CODE, withNextCode } from '../../lib/codes';
import { int, money, nullableDate, nullableId, nullableText, positiveMoney, queryEnum, text } from '../../lib/validate';

const r = Router();
const guard = requireModule('orders');

const STAGE_LABEL: Record<OrderStage, string> = {
  NEW: 'New', QUOTED: 'Quoted', SAMPLE: 'Sample', IN_PRODUCTION: 'In production',
  QUALITY_CHECK: 'Quality check', READY: 'Ready', DELIVERED: 'Delivered', CANCELLED: 'Cancelled',
};

const orderSchema = z.object({
  customerId: nullableId,
  type: z.nativeEnum(OrderType).default('CUSTOM_DESIGN'),
  title: text(2, 160),
  quantity: int(1, 10_000_000).default(1),
  total: money.default(0),
  dueDate: nullableDate,
  assignedTo: nullableText(120),
  designId: nullableId,
  notes: z.string().max(5000).default(''),
});

const withTotals = { customer: true, payments: { orderBy: { date: 'desc' as const } }, events: { orderBy: { createdAt: 'asc' as const } } };

function shape<T extends { total: unknown; payments: { amount: unknown; kind: string }[] }>(o: T) {
  const paid = o.payments.filter((p) => p.kind === 'INCOME').reduce((s, p) => s + Number(p.amount), 0);
  return { ...o, paid, balance: Math.max(0, Number(o.total) - paid) };
}

/** ?q= search, ?type=, ?stage= (or ?stage=CANCELLED to see cancelled orders; they are hidden otherwise). */
r.get('/', guard, ah(async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : '';
  const type = queryEnum(OrderType, req.query.type, 'order type');
  const stage = queryEnum(OrderStage, req.query.stage, 'stage');
  const orders = await prisma.order.findMany({
    where: {
      stage: stage ?? { not: 'CANCELLED' },
      type,
      ...(q ? { OR: [{ code: { contains: q, mode: 'insensitive' } }, { title: { contains: q, mode: 'insensitive' } }, { customer: { name: { contains: q, mode: 'insensitive' } } }] } : {}),
    },
    include: withTotals,
    orderBy: { createdAt: 'desc' },
    take: 500,
  });
  res.json(orders.map(shape));
}));

r.get('/:id', guard, ah(async (req, res) => {
  res.json(shape(await prisma.order.findUniqueOrThrow({ where: { id: req.params.id }, include: withTotals })));
}));

r.post('/', guard, ah(async (req, res) => {
  const data = orderSchema.parse(req.body);
  const order = await withNextCode(ORDER_CODE, (code) => prisma.order.create({
    data: { ...data, code, events: { create: { text: `Order created by ${req.user!.name}` } } },
    include: withTotals,
  }));
  logActivity(req, `created order ${order.code}`, 'order', order.id);
  res.status(201).json(shape(order));
}));

r.patch('/:id', guard, ah(async (req, res) => {
  const data = orderSchema.partial().extend({ stage: z.nativeEnum(OrderStage).optional() }).parse(req.body);
  const before = await prisma.order.findUniqueOrThrow({ where: { id: req.params.id } });
  // Moving a cancelled order to another stage re-opens it; the move is recorded like any other.
  const order = await prisma.order.update({
    where: { id: req.params.id },
    data: {
      ...data,
      ...(data.stage && data.stage !== before.stage
        ? { events: { create: { text: `Moved to ${STAGE_LABEL[data.stage]} by ${req.user!.name}` } } }
        : {}),
    },
    include: withTotals,
  });
  logActivity(req, data.stage && data.stage !== before.stage ? `moved ${order.code} to ${STAGE_LABEL[data.stage]}` : `updated order ${order.code}`, 'order', order.id);
  res.json(shape(order));
}));

/** Records a customer payment. It also appears in Finance as income. */
r.post('/:id/payments', guard, ah(async (req, res) => {
  const { amount, method, note } = z.object({
    amount: positiveMoney,
    method: z.nativeEnum(PayMethod),
    note: z.string().max(200).default(''),
  }).parse(req.body);
  const order = await prisma.order.findUniqueOrThrow({ where: { id: req.params.id } });
  if (order.stage === 'CANCELLED') throw new HttpError(400, 'This order is cancelled');
  const amountText = amount.toLocaleString('en-US', { maximumFractionDigits: 2 });
  await prisma.$transaction([
    prisma.transaction.create({ data: { kind: 'INCOME', source: 'ORDER', category: 'Order payment', amount, method, orderId: order.id, description: [`Payment · ${order.code} ${order.title}`, note].filter(Boolean).join(' · ').slice(0, 300) } }),
    prisma.orderEvent.create({ data: { orderId: order.id, text: `Payment of ETB ${amountText} received (${method.replace('_', ' ')})${note ? ` · ${note}` : ''}` } }),
  ]);
  logActivity(req, `recorded ETB ${amountText} payment for ${order.code}`, 'order', order.id);
  notifyTelegram('payment', `Payment received: ETB ${amountText} for ${order.code} (${method.replace('_', ' ')}).`);
  res.status(201).json(shape(await prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: withTotals })));
}));

/** Orders are never deleted: "delete" cancels them, keeping their history and payments. */
r.delete('/:id', guard, ah(async (req, res) => {
  const before = await prisma.order.findUniqueOrThrow({ where: { id: req.params.id } });
  if (before.stage !== 'CANCELLED') {
    const order = await prisma.order.update({ where: { id: before.id }, data: { stage: 'CANCELLED', events: { create: { text: `Cancelled by ${req.user!.name}` } } } });
    logActivity(req, `cancelled order ${order.code}`, 'order', order.id);
  }
  res.status(204).end();
}));

export default r;

// ───── Website requests (orders and wholesale / export enquiries) ─────

export const requests = Router();

requests.get('/', guard, ah(async (req, res) => {
  const status = queryEnum(RequestStatus, req.query.status, 'status');
  res.json(await prisma.request.findMany({ where: { status }, orderBy: { createdAt: 'desc' }, take: 300 }));
}));

requests.patch('/:id', guard, ah(async (req, res) => {
  const { status } = z.object({ status: z.nativeEnum(RequestStatus) }).parse(req.body);
  const before = await prisma.request.findUniqueOrThrow({ where: { id: req.params.id } });
  if (before.status === 'CONVERTED' && status !== 'CONVERTED') throw new HttpError(400, 'This request is already an order');
  if (status === 'CONVERTED') throw new HttpError(400, 'Use “Make order” to turn a request into an order');
  const row = await prisma.request.update({ where: { id: before.id }, data: { status } });
  logActivity(req, `marked website request from ${row.name} as ${status.toLowerCase()}`, 'request', row.id);
  res.json(row);
}));

/**
 * Turns a website request into a customer (matched by phone or email, or new) and an order, in one step.
 * Converting the same request twice returns the existing order.
 */
requests.post('/:id/convert', guard, ah(async (req, res) => {
  const extra = z.object({ customerType: z.nativeEnum(CustomerType).optional() }).parse(req.body ?? {});
  const reqRow = await prisma.request.findUniqueOrThrow({ where: { id: req.params.id } });
  if (reqRow.orderId) return res.json(await prisma.order.findUnique({ where: { id: reqRow.orderId } }));

  const order = await withNextCode(ORDER_CODE, (code) => prisma.$transaction(async (tx) => {
    // Claim the request first, so two people clicking at once can't create two orders.
    const claimed = await tx.request.updateMany({ where: { id: reqRow.id, orderId: null }, data: { status: 'CONVERTED' } });
    if (claimed.count === 0) throw new HttpError(409, 'This request was just converted by someone else');

    const match = reqRow.phone ? { phone: reqRow.phone } : reqRow.email ? { email: reqRow.email } : null;
    const customer =
      (match ? await tx.customer.findFirst({ where: match }) : null) ??
      (await tx.customer.create({
        data: {
          name: reqRow.company || reqRow.name,
          phone: reqRow.phone || null,
          email: reqRow.email,
          telegram: reqRow.telegram,
          type: extra.customerType ?? (reqRow.company ? 'BUSINESS' : 'INDIVIDUAL'),
          notes: [reqRow.company ? `Contact: ${reqRow.name}` : '', reqRow.country ? `Country: ${reqRow.country}` : ''].filter(Boolean).join(' · '),
        },
      }));
    const enquiry = [reqRow.product, reqRow.quantity].filter(Boolean).join(' · ');
    const created = await tx.order.create({
      data: {
        code,
        customerId: customer.id,
        type: reqRow.type,
        title: (enquiry || reqRow.message).slice(0, 80) || reqRow.type.replace(/_/g, ' ').toLowerCase(),
        dueDate: reqRow.neededBy,
        notes: [reqRow.message, reqRow.currency ? `Quote in ${reqRow.currency}` : '', reqRow.attachmentUrl ? `Attachment: ${reqRow.attachmentUrl}` : ''].filter(Boolean).join('\n'),
        events: { create: [{ text: 'Request received from the website', createdAt: reqRow.createdAt }, { text: `Converted to an order by ${req.user!.name}` }] },
      },
    });
    await tx.request.update({ where: { id: reqRow.id }, data: { orderId: created.id } });
    return created;
  }));
  logActivity(req, `converted website request into ${order.code}`, 'order', order.id);
  res.status(201).json(order);
}));
