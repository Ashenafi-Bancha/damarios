import { Router } from 'express';
import { z } from 'zod';
import { ApplicationStatus, EnrollmentStatus, PayMethod, TrainingDept } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ah, HttpError } from '../../lib/http';
import { requireModule } from '../../lib/auth';
import { crud } from '../../lib/crud';
import { logActivity } from '../../lib/activity';
import { notifyTelegram } from '../../lib/telegram';
import { etPeriod, etPeriodRange } from '../../lib/ethiopian';
import { certificateCode, studentCode, withNextCode } from '../../lib/codes';
import { id, int, money, nullableDate, nullableText, phone, positiveMoney, queryEnum, text } from '../../lib/validate';

/** Skill training center: courses, classes, students, enrollments, fees, certificates and website applications. */
const r = Router();
const guard = requireModule('training');

r.use('/courses', crud({
  model: 'course', module: 'training', orderBy: { sortOrder: 'asc' }, filters: ['department'], search: ['name'],
  include: { _count: { select: { classes: true } } },
  schema: z.object({
    name: text(2, 120),
    department: z.nativeEnum(TrainingDept),
    duration: z.string().max(60).default(''),
    fee: money.default(0),
    description: z.string().max(3000).default(''),
    published: z.boolean().default(true),
    sortOrder: int(-10_000, 10_000).default(0),
  }),
}));

r.use('/classes', crud({
  model: 'trainingClass', module: 'training', orderBy: { startDate: 'desc' }, filters: ['courseId'], search: ['name', 'instructor'],
  include: { course: true, _count: { select: { enrollments: { where: { status: { not: 'DROPPED' } } } } } },
  schema: z.object({
    courseId: id,
    name: text(1, 80),
    instructor: z.string().max(120).default(''),
    schedule: z.string().max(120).default(''),
    capacity: int(1, 1000).default(20),
    startDate: nullableDate,
    endDate: nullableDate,
  }),
  check: (c) => {
    if (c.startDate && c.endDate && (c.endDate as Date) < (c.startDate as Date)) throw new HttpError(400, 'End date: must be after the start date');
  },
}));

const studentFields = z.object({
  name: text(2, 120),
  phone,
  gender: z.preprocess((v) => (v === '' ? null : v), z.enum(['Female', 'Male']).nullable().optional()),
  age: z.preprocess((v) => (v === '' || v === null ? null : v), int(10, 90).nullable().optional()),
  education: nullableText(60),
  notes: z.string().max(3000).default(''),
});

/** Adding a student by hand: the student code is generated. */
r.post('/students', guard, ah(async (req, res) => {
  const data = studentFields.parse(req.body);
  const s = await withNextCode(studentCode(), (code) => prisma.student.create({ data: { ...data, code } }));
  logActivity(req, `added student ${s.name}`, 'student', s.id);
  res.status(201).json(s);
}));

r.use('/students', crud({
  model: 'student', module: 'training', orderBy: { createdAt: 'desc' }, search: ['name', 'phone', 'code'],
  include: { enrollments: { include: { class: { include: { course: true } }, payments: true } } },
  schema: studentFields.extend({ code: text(2, 30) }),
}));

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/**
 * The class, if it still has a free place. Students who completed the class keep their place in it; only
 * dropping out frees one (the same count the class list shows). Runs inside the enrolling transaction so
 * two people can't take the last place.
 */
async function placeInClass(tx: Tx, classId: string) {
  const cls = await tx.trainingClass.findUnique({ where: { id: classId }, include: { course: true, _count: { select: { enrollments: { where: { status: { not: 'DROPPED' } } } } } } });
  if (!cls) throw new HttpError(400, 'Choose a class');
  if (cls._count.enrollments >= cls.capacity) throw new HttpError(400, `${cls.course.name} · ${cls.name} is full (${cls.capacity} students)`);
  return cls;
}

const enrollmentInclude = {
  student: true,
  class: { include: { course: true } },
  payments: { orderBy: { date: 'desc' as const } },
};

function withBalance<T extends { fee: unknown; payments: { amount: unknown }[] }>(e: T) {
  const paid = e.payments.reduce((s, p) => s + Number(p.amount), 0);
  return { ...e, paid, balance: Math.max(0, Number(e.fee) - paid) };
}

r.get('/enrollments', guard, ah(async (req, res) => {
  const dept = queryEnum(TrainingDept, req.query.department, 'department');
  const status = queryEnum(EnrollmentStatus, req.query.status, 'status');
  const rows = await prisma.enrollment.findMany({
    where: { status, class: dept ? { course: { department: dept } } : undefined },
    include: enrollmentInclude,
    orderBy: { createdAt: 'desc' },
    take: 500,
  });
  res.json(rows.map(withBalance));
}));

/** Enrolls a student in a class. The fee defaults to the course fee. */
r.post('/enrollments', guard, ah(async (req, res) => {
  const data = z.object({ studentId: id, classId: id, fee: z.preprocess((v) => (v === '' || v === null ? undefined : v), money.optional()) }).parse(req.body);
  const e = await prisma.$transaction(async (tx) => {
    const cls = await placeInClass(tx, data.classId);
    const already = await tx.enrollment.findUnique({ where: { studentId_classId: { studentId: data.studentId, classId: cls.id } } });
    if (already) throw new HttpError(409, 'This student is already in this class');
    return tx.enrollment.create({ data: { studentId: data.studentId, classId: cls.id, fee: data.fee ?? cls.course.fee }, include: enrollmentInclude });
  }, { isolationLevel: 'Serializable' });
  const cls = e.class;
  logActivity(req, `enrolled ${e.student.name} in ${cls.course.name}`, 'enrollment', e.id);
  res.status(201).json(withBalance(e));
}));

r.patch('/enrollments/:id', guard, ah(async (req, res) => {
  const data = z.object({
    status: z.nativeEnum(EnrollmentStatus).optional(),
    fee: money.optional(),
    attendancePct: z.preprocess((v) => (v === '' ? null : v), int(0, 100).nullable().optional()),
    result: nullableText(60),
  }).parse(req.body);
  if (data.fee !== undefined) {
    const current = await prisma.enrollment.findUniqueOrThrow({ where: { id: req.params.id }, include: { payments: true } });
    const paid = current.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    if (data.fee < paid) throw new HttpError(400, `The fee can’t be less than what was already paid (ETB ${paid.toLocaleString('en-US')})`);
  }
  const e = await prisma.enrollment.update({ where: { id: req.params.id }, data, include: enrollmentInclude });
  logActivity(req, `updated enrollment of ${e.student.name}`, 'enrollment', e.id);
  res.json(withBalance(e));
}));

/** Records a fee payment; it also appears in Finance as income. */
r.post('/enrollments/:id/payments', guard, ah(async (req, res) => {
  const { amount, method } = z.object({ amount: positiveMoney, method: z.nativeEnum(PayMethod) }).parse(req.body);
  const e = await prisma.$transaction(async (tx) => {
    const e = await tx.enrollment.findUniqueOrThrow({ where: { id: req.params.id }, include: enrollmentInclude });
    const balance = withBalance(e).balance;
    if (balance <= 0) throw new HttpError(400, 'This student has already paid in full');
    if (amount > balance + 0.001) throw new HttpError(400, `The balance is only ETB ${balance.toLocaleString('en-US')}`);
    await tx.feePayment.create({ data: { enrollmentId: e.id, amount, method } });
    await tx.transaction.create({ data: { kind: 'INCOME', source: 'TRAINING', category: 'Training fees', amount, method, description: `Fee · ${e.student.name} · ${e.class.course.name}` } });
    return e;
  }, { isolationLevel: 'Serializable' });
  logActivity(req, `recorded ETB ${amount} fee from ${e.student.name}`, 'enrollment', e.id);
  notifyTelegram('payment', `Training fee received: ETB ${amount.toLocaleString('en-US')} from ${e.student.name} (${e.class.course.name}).`);
  res.status(201).json(withBalance(await prisma.enrollment.findUniqueOrThrow({ where: { id: e.id }, include: enrollmentInclude })));
}));

/** Marks the course completed and issues a numbered certificate. Fees must be fully paid. */
r.post('/enrollments/:id/certificate', guard, ah(async (req, res) => {
  const e = await prisma.enrollment.findUniqueOrThrow({ where: { id: req.params.id }, include: enrollmentInclude });
  if (e.certificateNo) return res.json(withBalance(e));
  if (withBalance(e).balance > 0) throw new HttpError(400, 'The student still has an unpaid balance');
  if (e.status === 'DROPPED') throw new HttpError(400, 'This student dropped the course');
  const updated = await withNextCode(certificateCode(), (certificateNo) => prisma.enrollment.update({
    where: { id: e.id },
    data: { status: 'COMPLETED', certificateNo, certificateDate: new Date() },
    include: enrollmentInclude,
  }));
  logActivity(req, `issued certificate ${updated.certificateNo} to ${e.student.name}`, 'enrollment', e.id);
  res.json(withBalance(updated));
}));

// ───── Applications from the website ─────

r.get('/applications', guard, ah(async (req, res) => {
  const status = queryEnum(ApplicationStatus, req.query.status, 'status');
  res.json(await prisma.trainingApplication.findMany({ where: { status }, include: { course: true }, orderBy: { createdAt: 'desc' }, take: 300 }));
}));

r.patch('/applications/:id', guard, ah(async (req, res) => {
  const { status } = z.object({ status: z.enum(['NEW', 'REJECTED']) }).parse(req.body);
  const current = await prisma.trainingApplication.findUniqueOrThrow({ where: { id: req.params.id } });
  if (current.status === 'ACCEPTED') throw new HttpError(400, 'This application was already accepted');
  const row = await prisma.trainingApplication.update({ where: { id: current.id }, data: { status } });
  logActivity(req, `${status === 'REJECTED' ? 'declined' : 'reopened'} the training application from ${row.name}`, 'trainingApplication', row.id);
  res.json(row);
}));

/** Accepts an application: finds or creates the student (by phone) and enrolls them in the chosen class. */
r.post('/applications/:id/accept', guard, ah(async (req, res) => {
  const { classId } = z.object({ classId: id }).parse(req.body);
  const { a, cls, student, enrollment } = await withNextCode(studentCode(), (newCode) => prisma.$transaction(async (tx) => {
    const a = await tx.trainingApplication.findUniqueOrThrow({ where: { id: req.params.id } });
    if (a.status === 'ACCEPTED') throw new HttpError(409, 'This application was already accepted');
    const cls = await placeInClass(tx, classId);
    const student = (await tx.student.findFirst({ where: { phone: a.phone } }))
      ?? (await tx.student.create({ data: { code: newCode, name: a.name, phone: a.phone, age: a.age, education: a.education } }));
    const existing = await tx.enrollment.findUnique({ where: { studentId_classId: { studentId: student.id, classId } } });
    const enrollment = existing ?? (await tx.enrollment.create({ data: { studentId: student.id, classId, fee: cls.course.fee } }));
    await tx.trainingApplication.update({ where: { id: a.id }, data: { status: 'ACCEPTED' } });
    return { a, cls, student, enrollment };
  }, { isolationLevel: 'Serializable' }));
  logActivity(req, `accepted ${a.name} into ${cls.course.name}`, 'enrollment', enrollment.id);
  res.status(201).json({ student, enrollment });
}));

// ───── Summary for the training dashboard ─────

r.get('/summary', guard, ah(async (_req, res) => {
  const { start, end } = etPeriodRange(etPeriod());
  const [active, newApps, fees, enrollments, readyCerts] = await Promise.all([
    prisma.enrollment.findMany({ where: { status: 'ENROLLED' }, select: { class: { select: { course: { select: { department: true } } } } } }),
    prisma.trainingApplication.count({ where: { status: 'NEW' } }),
    prisma.feePayment.aggregate({ where: { date: { gte: start, lt: end } }, _sum: { amount: true } }),
    prisma.enrollment.findMany({ where: { status: { not: 'DROPPED' } }, select: { fee: true, payments: { select: { amount: true } } } }),
    prisma.enrollment.findMany({ where: { status: { not: 'DROPPED' }, certificateNo: null, class: { endDate: { lt: new Date() } } }, select: { fee: true, payments: { select: { amount: true } } } }),
  ]);
  const byDept = { FASHION: 0, CULINARY: 0, BEAUTY: 0 } as Record<TrainingDept, number>;
  for (const e of active) byDept[e.class.course.department] += 1;
  const owedList = enrollments.map((e) => Number(e.fee) - e.payments.reduce((s, p) => s + Number(p.amount), 0)).filter((x) => x > 0);
  res.json({
    enrolled: active.length,
    byDept,
    newApplications: newApps,
    feesThisMonth: Number(fees._sum.amount ?? 0),
    owed: owedList.reduce((s, x) => s + x, 0),
    studentsOwing: owedList.length,
    certificatesReady: readyCerts.filter((e) => Number(e.fee) <= e.payments.reduce((s, p) => s + Number(p.amount), 0)).length,
  });
}));

export default r;
