import { Router } from 'express';
import { z } from 'zod';
import { OrderStage, OrderType, PayMethod, RequestStatus, CustomerType } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ah } from '../../lib/http';
import { requireModule } from '../../lib/auth';
import { logActivity } from '../../lib/activity';

const r = Router();
const guard = requireModule('orders');

const STAGE_LABEL: Record<OrderStage, string> = {
  NEW: 'New', QUOTED: 'Quoted', SAMPLE: 'Sample', IN_PRODUCTION: 'In production',
  QUALITY_CHECK: 'Quality check', READY: 'Ready', DELIVERED: 'Delivered', CANCELLED: 'Cancelled',
};

async function nextCode() {
  const last = await prisma.order.findFirst({ orderBy: { createdAt: 'desc' }, select: { code: true } });
  const n = last ? parseInt(last.code.replace(/\D/g, ''), 10) || 0 : 100;
  return `DM-${String(n + 1).padStart(4, '0')}`;
}

const orderSchema = z.object({
  customerId: z.string().nullable().optional(),
  type: z.nativeEnum(OrderType).default('CUSTOM_DESIGN'),
  title: z.string().trim().min(2),
  quantity: z.coerce.number().int().min(1).default(1),
  total: z.coerce.number().min(0).default(0),
  dueDate: z.coerce.date().nullable().optional(),
  assignedTo: z.string().nullable().optional(),
  designId: z.string().nullable().optional(),
  notes: z.string().default(''),
});

const withTotals = { customer: true, payments: true, events: { orderBy: { createdAt: 'asc' as const } } };

function shape<T extends { payments: { amount: unknown; kind: string }[] }>(o: T) {
  const paid = o.payments.filter((p) => p.kind === 'INCOME').reduce((s, p) => s + Number(p.amount), 0);
  return { ...o, paid };
}

r.get('/', guard, ah(async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const type = typeof req.query.type === 'string' && req.query.type ? (req.query.type as OrderType) : undefined;
  const orders = await prisma.order.findMany({
    where: {
      stage: { not: 'CANCELLED' },
      type,
      ...(q ? { OR: [{ code: { contains: q, mode: 'insensitive' } }, { title: { contains: q, mode: 'insensitive' } }, { customer: { name: { contains: q, mode: 'insensitive' } } }] } : {}),
    },
    include: withTotals,
    orderBy: { createdAt: 'desc' },
  });
  res.json(orders.map(shape));
}));

r.get('/:id', guard, ah(async (req, res) => {
  res.json(shape(await prisma.order.findUniqueOrThrow({ where: { id: req.params.id }, include: withTotals })));
}));

r.post('/', guard, ah(async (req, res) => {
  const data = orderSchema.parse(req.body);
  const order = await prisma.order.create({
    data: { ...data, code: await nextCode(), events: { create: { text: `Order created by ${req.user!.name}` } } },
    include: withTotals,
  });
  logActivity(req, `created order ${order.code}`, 'order', order.id);
  res.status(201).json(shape(order));
}));

r.patch('/:id', guard, ah(async (req, res) => {
  const data = orderSchema.partial().extend({ stage: z.nativeEnum(OrderStage).optional() }).parse(req.body);
  const before = await prisma.order.findUniqueOrThrow({ where: { id: req.params.id } });
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
  logActivity(req, data.stage ? `moved ${order.code} to ${STAGE_LABEL[data.stage]}` : `updated order ${order.code}`, 'order', order.id);
  res.json(shape(order));
}));

r.post('/:id/payments', guard, ah(async (req, res) => {
  const { amount, method } = z.object({ amount: z.coerce.number().positive(), method: z.nativeEnum(PayMethod) }).parse(req.body);
  const order = await prisma.order.findUniqueOrThrow({ where: { id: req.params.id } });
  await prisma.$transaction([
    prisma.transaction.create({ data: { kind: 'INCOME', category: 'Order payment', amount, method, orderId: order.id, description: `Payment · ${order.code} ${order.title}` } }),
    prisma.orderEvent.create({ data: { orderId: order.id, text: `Payment of ETB ${amount.toLocaleString('en-US')} received (${method.replace('_', ' ')})` } }),
  ]);
  logActivity(req, `recorded ETB ${amount} payment for ${order.code}`, 'order', order.id);
  res.status(201).json(shape(await prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: withTotals })));
}));

r.delete('/:id', guard, ah(async (req, res) => {
  const order = await prisma.order.update({ where: { id: req.params.id }, data: { stage: 'CANCELLED', events: { create: { text: `Cancelled by ${req.user!.name}` } } } });
  logActivity(req, `cancelled order ${order.code}`, 'order', order.id);
  res.status(204).end();
}));

export default r;

// ───── Website requests (quotes, bookings, seats) ─────

export const requests = Router();

requests.get('/', guard, ah(async (req, res) => {
  const status = typeof req.query.status === 'string' && req.query.status ? (req.query.status as RequestStatus) : undefined;
  res.json(await prisma.request.findMany({ where: { status }, orderBy: { createdAt: 'desc' }, take: 300 }));
}));

requests.patch('/:id', guard, ah(async (req, res) => {
  const { status } = z.object({ status: z.nativeEnum(RequestStatus) }).parse(req.body);
  res.json(await prisma.request.update({ where: { id: req.params.id }, data: { status } }));
}));

/** Turns a website request into a customer (found by phone, or new) and an order. */
requests.post('/:id/convert', guard, ah(async (req, res) => {
  const reqRow = await prisma.request.findUniqueOrThrow({ where: { id: req.params.id } });
  if (reqRow.orderId) return res.json(await prisma.order.findUnique({ where: { id: reqRow.orderId } }));
  const extra = z.object({ customerType: z.nativeEnum(CustomerType).optional() }).parse(req.body ?? {});
  // Match an existing customer by phone or email; wholesale/export buyers become business customers named after their company.
  const match = reqRow.phone ? { phone: reqRow.phone } : reqRow.email ? { email: reqRow.email } : null;
  const customer =
    (match ? await prisma.customer.findFirst({ where: match }) : null) ??
    (await prisma.customer.create({
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
  const order = await prisma.order.create({
    data: {
      code: await nextCode(),
      customerId: customer.id,
      type: reqRow.type,
      title: (enquiry || reqRow.message).slice(0, 80) || reqRow.type.replace(/_/g, ' ').toLowerCase(),
      dueDate: reqRow.neededBy,
      notes: [reqRow.message, reqRow.currency ? `Quote in ${reqRow.currency}` : ''].filter(Boolean).join('\n'),
      events: { create: [{ text: 'Request received from the website', createdAt: reqRow.createdAt }, { text: `Converted to an order by ${req.user!.name}` }] },
    },
  });
  await prisma.request.update({ where: { id: reqRow.id }, data: { status: 'CONVERTED', orderId: order.id } });
  logActivity(req, `converted website request into ${order.code}`, 'order', order.id);
  res.status(201).json(order);
}));
