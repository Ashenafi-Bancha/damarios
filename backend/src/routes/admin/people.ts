import { Router } from 'express';
import { z } from 'zod';
import { AttendanceStatus, LeaveStatus, PayType, PayrollStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ah, HttpError } from '../../lib/http';
import { requireModule } from '../../lib/auth';
import { crud } from '../../lib/crud';
import { logActivity } from '../../lib/activity';
import { etPeriod, etPeriodLabel, etPeriodRange } from '../../lib/ethiopian';

const r = Router();
const staff = requireModule('employees');
const payroll = requireModule('payroll');

// ───── Employees ─────

export const employeeSchema = z.object({
  code: z.string().min(2),
  name: z.string().min(2),
  role: z.string().min(2),
  department: z.string().min(2),
  payType: z.nativeEnum(PayType).default('MONTHLY'),
  rate: z.coerce.number().min(0).default(0),
  phone: z.string().nullable().optional(),
  joinedAt: z.coerce.date().optional(),
  active: z.boolean().default(true),
});

r.use('/employees', crud({
  model: 'employee', module: 'employees', orderBy: { code: 'asc' }, search: ['name', 'role', 'code'], filters: ['department', 'active'],
  schema: employeeSchema,
}));

// ───── Attendance ─────

function dayOnly(d = new Date()) {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

r.get('/attendance', staff, ah(async (req, res) => {
  const date = typeof req.query.date === 'string' ? dayOnly(new Date(req.query.date)) : dayOnly();
  const [employees, rows] = await Promise.all([
    prisma.employee.findMany({ where: { active: true }, orderBy: { code: 'asc' } }),
    prisma.attendance.findMany({ where: { date } }),
  ]);
  const byEmp = new Map(rows.map((a) => [a.employeeId, a]));
  res.json(employees.map((e) => ({ employee: e, attendance: byEmp.get(e.id) ?? null })));
}));

/** Check-in from the gate tablet (QR) or by a supervisor. After the start time the status is Late. */
r.post('/attendance/check', staff, ah(async (req, res) => {
  const { employeeId, action } = z.object({ employeeId: z.string(), action: z.enum(['in', 'out']) }).parse(req.body);
  const now = new Date();
  const date = dayOnly(now);
  const setting = await prisma.setting.findUnique({ where: { key: 'business' } });
  const start = String((setting?.value as Record<string, unknown> | null)?.startTime ?? '08:00');
  const [h, m] = start.split(':').map(Number);
  const late = now.getHours() * 60 + now.getMinutes() > h * 60 + m + 10;
  const row = await prisma.attendance.upsert({
    where: { employeeId_date: { employeeId, date } },
    update: action === 'in' ? { checkIn: now } : { checkOut: now },
    create: { employeeId, date, checkIn: action === 'in' ? now : null, checkOut: action === 'out' ? now : null, status: late ? 'LATE' : 'PRESENT' },
  });
  res.json(row);
}));

r.put('/attendance', staff, ah(async (req, res) => {
  const { employeeId, date, status } = z.object({ employeeId: z.string(), date: z.coerce.date(), status: z.nativeEnum(AttendanceStatus) }).parse(req.body);
  const d = dayOnly(date);
  res.json(await prisma.attendance.upsert({ where: { employeeId_date: { employeeId, date: d } }, update: { status }, create: { employeeId, date: d, status } }));
}));

// ───── Leave ─────

r.get('/leave', staff, ah(async (_req, res) => {
  res.json(await prisma.leaveRequest.findMany({ include: { employee: { select: { name: true, role: true } } }, orderBy: { createdAt: 'desc' }, take: 100 }));
}));

r.post('/leave', staff, ah(async (req, res) => {
  const data = z.object({ employeeId: z.string(), kind: z.string().min(2), fromDate: z.coerce.date(), toDate: z.coerce.date() }).parse(req.body);
  if (data.toDate < data.fromDate) throw new HttpError(400, 'The end date is before the start date');
  res.status(201).json(await prisma.leaveRequest.create({ data }));
}));

r.patch('/leave/:id', staff, ah(async (req, res) => {
  const { status } = z.object({ status: z.nativeEnum(LeaveStatus) }).parse(req.body);
  const leave = await prisma.leaveRequest.update({ where: { id: req.params.id }, data: { status }, include: { employee: true } });
  logActivity(req, `${status === 'APPROVED' ? 'approved' : 'declined'} leave for ${leave.employee.name}`, 'leave', leave.id);
  res.json(leave);
}));

// ───── Payroll ─────

interface Bracket { from: number; to: number | null; rate: number; deduction: number }
interface PayrollSettings { pensionEmployee: number; pensionEmployer: number; overtimeMultiplier?: number; brackets: Bracket[] }

async function payrollSettings(): Promise<PayrollSettings> {
  const s = await prisma.setting.findUnique({ where: { key: 'payroll' } });
  const v = (s?.value ?? {}) as Partial<PayrollSettings>;
  return { pensionEmployee: v.pensionEmployee ?? 7, pensionEmployer: v.pensionEmployer ?? 11, brackets: v.brackets ?? [] };
}

function incomeTax(gross: number, brackets: Bracket[]) {
  const b = brackets.find((x) => gross >= x.from && (x.to === null || gross <= x.to));
  if (!b) return 0;
  return Math.max(0, (gross * b.rate) / 100 - b.deduction);
}

const round = (n: number) => Math.round(n * 100) / 100;

r.get('/payroll', payroll, ah(async (_req, res) => {
  const runs = await prisma.payrollRun.findMany({ orderBy: { period: 'desc' }, include: { items: true } });
  res.json({
    current: etPeriod(),
    runs: runs.map((run) => ({
      ...run,
      label: etPeriodLabel(run.period),
      totals: run.items.reduce((t, i) => ({
        gross: t.gross + Number(i.gross), tax: t.tax + Number(i.tax),
        pensionEmployee: t.pensionEmployee + Number(i.pensionEmployee), pensionEmployer: t.pensionEmployer + Number(i.pensionEmployer), net: t.net + Number(i.net),
      }), { gross: 0, tax: 0, pensionEmployee: 0, pensionEmployer: 0, net: 0 }),
    })),
  });
}));

r.get('/payroll/:period', payroll, ah(async (req, res) => {
  const run = await prisma.payrollRun.findUnique({ where: { period: req.params.period }, include: { items: { include: { employee: true } } } });
  res.json(run ? { ...run, label: etPeriodLabel(run.period) } : null);
}));

/** Builds (or rebuilds) the draft payroll for an Ethiopian month from salaries, production output and attendance. */
r.post('/payroll/:period/generate', payroll, ah(async (req, res) => {
  const period = req.params.period;
  if (!/^\d{4}-(0[1-9]|1[0-3])$/.test(period)) throw new HttpError(400, 'Period must look like 2019-02');
  const existing = await prisma.payrollRun.findUnique({ where: { period } });
  if (existing && existing.status !== 'DRAFT') throw new HttpError(409, 'This payroll is already approved');
  const { start, end } = etPeriodRange(period);
  const settings = await payrollSettings();
  const employees = await prisma.employee.findMany({ where: { active: true } });

  const items = await Promise.all(employees.map(async (e) => {
    let basic = Number(e.rate);
    if (e.payType === 'PIECE_RATE') {
      const out = await prisma.outputLog.aggregate({ where: { employeeId: e.id, createdAt: { gte: start, lt: end } }, _sum: { pieces: true } });
      basic = Number(e.rate) * (out._sum.pieces ?? 0);
    } else if (e.payType === 'PER_BOOKING') {
      const days = await prisma.attendance.count({ where: { employeeId: e.id, date: { gte: start, lt: end }, status: { in: ['PRESENT', 'LATE'] } } });
      basic = Number(e.rate) * days;
    }
    const gross = round(basic);
    const pensionEmployee = round((gross * settings.pensionEmployee) / 100);
    const pensionEmployer = round((gross * settings.pensionEmployer) / 100);
    const tax = round(incomeTax(gross, settings.brackets));
    return { employeeId: e.id, basic: gross, overtime: 0, gross, tax, pensionEmployee, pensionEmployer, net: round(gross - tax - pensionEmployee) };
  }));

  const run = await prisma.$transaction(async (tx) => {
    if (existing) await tx.payrollRun.delete({ where: { id: existing.id } });
    return tx.payrollRun.create({ data: { period, items: { create: items } }, include: { items: { include: { employee: true } } } });
  });
  logActivity(req, `generated payroll for ${etPeriodLabel(period)}`, 'payroll', run.id);
  res.status(201).json({ ...run, label: etPeriodLabel(period), warning: settings.brackets.length ? null : 'No income tax brackets are set. Tax was calculated as 0. Add them in Settings › Payroll & tax.' });
}));

r.patch('/payroll/:period', payroll, ah(async (req, res) => {
  const { status } = z.object({ status: z.nativeEnum(PayrollStatus) }).parse(req.body);
  const run = await prisma.payrollRun.update({ where: { period: req.params.period }, data: { status }, include: { items: true } });
  if (status === 'PAID') {
    const net = run.items.reduce((s, i) => s + Number(i.net), 0);
    await prisma.transaction.create({ data: { kind: 'EXPENSE', category: 'Salaries & payroll', amount: net, method: 'BANK', description: `Payroll ${etPeriodLabel(run.period)}` } });
  }
  logActivity(req, `marked payroll ${etPeriodLabel(run.period)} as ${status.toLowerCase()}`, 'payroll', run.id);
  res.json(run);
}));

export default r;
