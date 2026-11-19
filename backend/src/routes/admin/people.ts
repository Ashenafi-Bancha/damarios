import { Router } from 'express';
import { z } from 'zod';
import { AttendanceStatus, LeaveStatus, PayType, PayrollStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ah, HttpError } from '../../lib/http';
import { requireModule } from '../../lib/auth';
import { crud } from '../../lib/crud';
import { logActivity } from '../../lib/activity';
import { EMPLOYEE_CODE, withNextCode } from '../../lib/codes';
import { id, money, nullablePhone, optionalDate, requiredDate, text } from '../../lib/validate';
import { etPeriod, etPeriodLabel, etPeriodRange } from '../../lib/ethiopian';

const r = Router();
const staff = requireModule('employees');
const payroll = requireModule('payroll');

// ───── Employees ─────

export const employeeSchema = z.object({
  code: text(2, 20),
  name: text(2, 120),
  role: text(2, 80),
  department: text(2, 80),
  payType: z.nativeEnum(PayType).default('MONTHLY'),
  rate: money.default(0),
  phone: nullablePhone,
  joinedAt: optionalDate,
  active: z.boolean().default(true),
});

/** Adding an employee: the code (DM-E001…) is generated unless one is typed in. */
r.post('/employees', staff, ah(async (req, res) => {
  const data = employeeSchema.extend({ code: z.preprocess((v) => (v === '' || v === null ? undefined : v), text(2, 20).optional()) }).parse(req.body);
  const { code: typed, ...rest } = data;
  const employee = typed
    ? await prisma.employee.create({ data: { ...rest, code: typed } })
    : await withNextCode(EMPLOYEE_CODE, (code) => prisma.employee.create({ data: { ...rest, code } }));
  logActivity(req, `added employee ${employee.name} (${employee.code})`, 'employee', employee.id);
  res.status(201).json(employee);
}));

r.use('/employees', crud({
  model: 'employee', module: 'employees', orderBy: { code: 'asc' }, search: ['name', 'role', 'code'], filters: ['department', 'active'],
  schema: employeeSchema,
}));

// ───── Attendance ─────

/** The calendar day (Ethiopian local time, see TZ in config) as a date-only value. */
function dayOnly(d = new Date()) {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

r.get('/attendance', staff, ah(async (req, res) => {
  const asked = typeof req.query.date === 'string' ? new Date(req.query.date) : new Date();
  if (Number.isNaN(asked.getTime())) throw new HttpError(400, 'Invalid date');
  const date = dayOnly(asked);
  const [employees, rows] = await Promise.all([
    prisma.employee.findMany({ where: { active: true }, orderBy: { code: 'asc' } }),
    prisma.attendance.findMany({ where: { date } }),
  ]);
  const byEmp = new Map(rows.map((a) => [a.employeeId, a]));
  res.json(employees.map((e) => ({ employee: e, attendance: byEmp.get(e.id) ?? null })));
}));

/** Check-in from the gate tablet (QR) or by a supervisor. After the start time the status is Late. */
r.post('/attendance/check', staff, ah(async (req, res) => {
  const { employeeId, action } = z.object({ employeeId: id, action: z.enum(['in', 'out']) }).parse(req.body);
  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee || !employee.active) throw new HttpError(400, 'Choose an active employee');
  const now = new Date();
  const date = dayOnly(now);
  const setting = await prisma.setting.findUnique({ where: { key: 'business' } });
  const start = String((setting?.value as Record<string, unknown> | null)?.startTime ?? '08:00');
  const [h, m] = /^\d{1,2}:\d{2}$/.test(start) ? start.split(':').map(Number) : [8, 0];
  const late = now.getHours() * 60 + now.getMinutes() > h * 60 + m + 10;
  const existing = await prisma.attendance.findUnique({ where: { employeeId_date: { employeeId, date } } });
  if (action === 'out' && !existing?.checkIn) throw new HttpError(400, `${employee.name} has not checked in today`);
  if (action === 'in' && existing?.checkIn) throw new HttpError(400, `${employee.name} already checked in today`);
  const row = await prisma.attendance.upsert({
    where: { employeeId_date: { employeeId, date } },
    update: action === 'in' ? { checkIn: now, status: late ? 'LATE' : 'PRESENT' } : { checkOut: now },
    create: { employeeId, date, checkIn: action === 'in' ? now : null, checkOut: action === 'out' ? now : null, status: late ? 'LATE' : 'PRESENT' },
  });
  res.json(row);
}));

r.put('/attendance', staff, ah(async (req, res) => {
  const { employeeId, date, status } = z.object({ employeeId: id, date: requiredDate, status: z.nativeEnum(AttendanceStatus) }).parse(req.body);
  if (date > new Date()) throw new HttpError(400, 'Attendance can’t be set for a future day');
  const d = dayOnly(date);
  res.json(await prisma.attendance.upsert({ where: { employeeId_date: { employeeId, date: d } }, update: { status }, create: { employeeId, date: d, status } }));
}));

// ───── Leave ─────

r.get('/leave', staff, ah(async (_req, res) => {
  res.json(await prisma.leaveRequest.findMany({ include: { employee: { select: { name: true, role: true } } }, orderBy: { createdAt: 'desc' }, take: 100 }));
}));

r.post('/leave', staff, ah(async (req, res) => {
  const data = z.object({ employeeId: id, kind: text(2, 60), fromDate: requiredDate, toDate: requiredDate }).parse(req.body);
  if (data.toDate < data.fromDate) throw new HttpError(400, 'The end date is before the start date');
  res.status(201).json(await prisma.leaveRequest.create({ data }));
}));

r.patch('/leave/:id', staff, ah(async (req, res) => {
  const { status } = z.object({ status: z.nativeEnum(LeaveStatus) }).parse(req.body);
  const current = await prisma.leaveRequest.findUniqueOrThrow({ where: { id: req.params.id } });
  if (current.status !== 'PENDING') throw new HttpError(400, `This leave was already ${current.status.toLowerCase()}`);
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
      // Paid for good pieces: defective pieces are recorded but not paid.
      const out = await prisma.outputLog.aggregate({ where: { employeeId: e.id, createdAt: { gte: start, lt: end } }, _sum: { pieces: true, defects: true } });
      basic = Number(e.rate) * Math.max(0, (out._sum.pieces ?? 0) - (out._sum.defects ?? 0));
    } else if (e.payType === 'DAILY') {
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

/** Draft → Approved → Paid. Paying records the salary expense in Finance, once; a paid payroll is final. */
const NEXT_STATUS: Record<PayrollStatus, PayrollStatus[]> = { DRAFT: ['APPROVED'], APPROVED: ['PAID', 'DRAFT'], PAID: [] };

r.patch('/payroll/:period', payroll, ah(async (req, res) => {
  const { status } = z.object({ status: z.nativeEnum(PayrollStatus) }).parse(req.body);
  const run = await prisma.$transaction(async (tx) => {
    const current = await tx.payrollRun.findUniqueOrThrow({ where: { period: req.params.period }, include: { items: true } });
    if (current.status === status) return current;
    if (!NEXT_STATUS[current.status].includes(status)) {
      throw new HttpError(400, current.status === 'PAID' ? 'This payroll is already paid' : `A ${current.status.toLowerCase()} payroll can’t be marked ${status.toLowerCase()}`);
    }
    // Only one request can move it on from this status: a second click at the same moment finds nothing to update.
    const moved = await tx.payrollRun.updateMany({ where: { id: current.id, status: current.status }, data: { status } });
    if (moved.count === 0) throw new HttpError(409, 'This payroll was just changed by someone else. Reload the page.');
    if (status === 'PAID') {
      const net = round(current.items.reduce((sum, i) => sum + Number(i.net), 0));
      if (net > 0) {
        await tx.transaction.create({ data: { kind: 'EXPENSE', source: 'PAYROLL', category: 'Salaries & payroll', amount: net, method: 'BANK', description: `Payroll ${etPeriodLabel(current.period)}` } });
      }
    }
    return { ...current, status };
  });
  logActivity(req, `marked payroll ${etPeriodLabel(run.period)} as ${status.toLowerCase()}`, 'payroll', run.id);
  res.json(run);
}));

export default r;
