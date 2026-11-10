import { Router } from 'express';
import { z } from 'zod';
import { PayMethod, TxKind } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ah } from '../../lib/http';
import { requireModule } from '../../lib/auth';
import { crud } from '../../lib/crud';
import { etPeriod, etPeriodLabel, etPeriodRange } from '../../lib/ethiopian';

const r = Router();
const guard = requireModule('finance');

r.get('/summary', guard, ah(async (req, res) => {
  const months = Math.min(12, Math.max(1, Number(req.query.months) || 6));
  // Walk back through Ethiopian months from the current one (the short month Pagume is left out of the chart).
  const periods: string[] = [];
  let [y, m] = etPeriod().split('-').map(Number);
  if (m === 13) m = 12;
  for (let i = 0; i < months; i++) {
    periods.unshift(`${y}-${String(m).padStart(2, '0')}`);
    m -= 1;
    if (m === 0) { m = 12; y -= 1; }
  }
  const series = await Promise.all(periods.map(async (p) => {
    const { start, end } = etPeriodRange(p);
    const sums = await prisma.transaction.groupBy({ by: ['kind'], where: { date: { gte: start, lt: end } }, _sum: { amount: true } });
    const get = (k: TxKind) => Number(sums.find((s) => s.kind === k)?._sum.amount ?? 0);
    return { period: p, label: etPeriodLabel(p), income: get('INCOME'), expense: get('EXPENSE') };
  }));
  const { start, end } = etPeriodRange(etPeriod());
  const byCategory = await prisma.transaction.groupBy({ by: ['category'], where: { kind: 'EXPENSE', date: { gte: start, lt: end } }, _sum: { amount: true } });
  const byMethod = await prisma.transaction.groupBy({ by: ['method'], where: { kind: 'INCOME', date: { gte: start, lt: end } }, _sum: { amount: true } });

  const openOrders = await prisma.order.findMany({ where: { stage: { notIn: ['CANCELLED'] } }, include: { payments: true } });
  const owed = openOrders.reduce((s, o) => {
    const paid = o.payments.filter((p) => p.kind === 'INCOME').reduce((a, p) => a + Number(p.amount), 0);
    return s + Math.max(0, Number(o.total) - paid);
  }, 0);

  res.json({
    series,
    current: series[series.length - 1],
    expensesByCategory: byCategory.map((c) => ({ category: c.category, amount: Number(c._sum.amount ?? 0) })).sort((a, b) => b.amount - a.amount),
    incomeByMethod: byMethod.map((c) => ({ method: c.method, amount: Number(c._sum.amount ?? 0) })),
    owed,
  });
}));

r.use('/transactions', crud({
  model: 'transaction', module: 'finance', orderBy: { date: 'desc' }, filters: ['kind', 'method'], search: ['description', 'category'],
  schema: z.object({
    kind: z.nativeEnum(TxKind),
    category: z.string().min(2),
    amount: z.coerce.number().positive(),
    method: z.nativeEnum(PayMethod).default('CASH'),
    description: z.string().default(''),
    date: z.coerce.date().optional(),
    orderId: z.string().nullable().optional(),
  }),
}));

export default r;
