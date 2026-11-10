import { Router } from 'express';
import { z } from 'zod';
import { ApplicationStatus, EnrollmentStatus, PayMethod, TrainingDept } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ah, HttpError } from '../../lib/http';
import { requireModule } from '../../lib/auth';
import { crud } from '../../lib/crud';
import { logActivity } from '../../lib/activity';
import { etPeriod, etPeriodRange } from '../../lib/ethiopian';

/** Skill training center: courses, classes, students, enrollments, fees, certificates and website applications. */
const r = Router();
const guard = requireModule('training');

r.use('/courses', crud({
  model: 'course', module: 'training', orderBy: { sortOrder: 'asc' }, filters: ['department'], search: ['name'],
  include: { _count: { select: { classes: true } } },
  schema: z.object({
    name: z.string().min(2),
    department: z.nativeEnum(TrainingDept),
    duration: z.string().default(''),
    fee: z.coerce.number().min(0).default(0),
    description: z.string().default(''),
    published: z.boolean().default(true),
    sortOrder: z.coerce.number().int().default(0),
  }),
}));

r.use('/classes', crud({
  model: 'trainingClass', module: 'training', orderBy: { startDate: 'desc' }, filters: ['courseId'], search: ['name', 'instructor'],
  include: { course: true, _count: { select: { enrollments: { where: { status: { not: 'DROPPED' } } } } } },
  schema: z.object({
    courseId: z.string(),
    name: z.string().min(1),
    instructor: z.string().default(''),
    schedule: z.string().default(''),
    capacity: z.coerce.number().int().min(1).default(20),
    startDate: z.coerce.date().nullable().optional(),
    endDate: z.coerce.date().nullable().optional(),
  }),
}));

async function nextStudentCode() {
  const year = new Date().getFullYear();
  const count = await prisma.student.count();
  return `DM-S${year}-${String(count + 1).padStart(4, '0')}`;
}

/** Adding a student by hand: the student code is generated. */
r.post('/students', guard, ah(async (req, res) => {
  const data = z.object({
    name: z.string().min(2), phone: z.string().min(7), gender: z.string().nullable().optional(),
    age: z.coerce.number().int().min(10).max(90).nullable().optional(), education: z.string().nullable().optional(), notes: z.string().default(''),
  }).parse(req.body);
  const s = await prisma.student.create({ data: { ...data, code: await nextStudentCode() } });
  logActivity(req, `added student ${s.name}`, 'student', s.id);
  res.status(201).json(s);
}));

r.use('/students', crud({
  model: 'student', module: 'training', orderBy: { createdAt: 'desc' }, search: ['name', 'phone', 'code'],
  include: { enrollments: { include: { class: { include: { course: true } }, payments: true } } },
  schema: z.object({
    code: z.string().min(2),
    name: z.string().min(2),
    phone: z.string().min(7),
    gender: z.string().nullable().optional(),
    age: z.coerce.number().int().min(10).max(90).nullable().optional(),
    education: z.string().nullable().optional(),
    notes: z.string().default(''),
  }),
}));

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
  const dept = typeof req.query.department === 'string' && req.query.department ? (req.query.department as TrainingDept) : undefined;
  const status = typeof req.query.status === 'string' && req.query.status ? (req.query.status as EnrollmentStatus) : undefined;
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
  const data = z.object({ studentId: z.string(), classId: z.string(), fee: z.coerce.number().min(0).optional() }).parse(req.body);
  const cls = await prisma.trainingClass.findUniqueOrThrow({ where: { id: data.classId }, include: { course: true, _count: { select: { enrollments: { where: { status: 'ENROLLED' } } } } } });
  if (cls._count.enrollments >= cls.capacity) throw new HttpError(400, `${cls.course.name} · ${cls.name} is full (${cls.capacity} students)`);
  const e = await prisma.enrollment.create({ data: { studentId: data.studentId, classId: cls.id, fee: data.fee ?? cls.course.fee }, include: enrollmentInclude });
  logActivity(req, `enrolled ${e.student.name} in ${cls.course.name}`, 'enrollment', e.id);
  res.status(201).json(withBalance(e));
}));

r.patch('/enrollments/:id', guard, ah(async (req, res) => {
  const data = z.object({
    status: z.nativeEnum(EnrollmentStatus).optional(),
    fee: z.coerce.number().min(0).optional(),
    attendancePct: z.coerce.number().int().min(0).max(100).nullable().optional(),
    result: z.string().nullable().optional(),
  }).parse(req.body);
  const e = await prisma.enrollment.update({ where: { id: req.params.id }, data, include: enrollmentInclude });
  logActivity(req, `updated enrollment of ${e.student.name}`, 'enrollment', e.id);
  res.json(withBalance(e));
}));

/** Records a fee payment; it also appears in Finance as income. */
r.post('/enrollments/:id/payments', guard, ah(async (req, res) => {
  const { amount, method } = z.object({ amount: z.coerce.number().positive(), method: z.nativeEnum(PayMethod) }).parse(req.body);
  const e = await prisma.enrollment.findUniqueOrThrow({ where: { id: req.params.id }, include: enrollmentInclude });
  const balance = withBalance(e).balance;
  if (amount > balance) throw new HttpError(400, `The balance is only ETB ${balance.toLocaleString('en-US')}`);
  await prisma.$transaction([
    prisma.feePayment.create({ data: { enrollmentId: e.id, amount, method } }),
    prisma.transaction.create({ data: { kind: 'INCOME', category: 'Training fees', amount, method, description: `Fee · ${e.student.name} · ${e.class.course.name}` } }),
  ]);
  logActivity(req, `recorded ETB ${amount} fee from ${e.student.name}`, 'enrollment', e.id);
  res.status(201).json(withBalance(await prisma.enrollment.findUniqueOrThrow({ where: { id: e.id }, include: enrollmentInclude })));
}));

/** Marks the course completed and issues a numbered certificate. Fees must be fully paid. */
r.post('/enrollments/:id/certificate', guard, ah(async (req, res) => {
  const e = await prisma.enrollment.findUniqueOrThrow({ where: { id: req.params.id }, include: enrollmentInclude });
  if (e.certificateNo) return res.json(withBalance(e));
  if (withBalance(e).balance > 0) throw new HttpError(400, 'The student still has an unpaid balance');
  const year = new Date().getFullYear();
  const issued = await prisma.enrollment.count({ where: { certificateNo: { not: null } } });
  const updated = await prisma.enrollment.update({
    where: { id: e.id },
    data: { status: 'COMPLETED', certificateNo: `DM-CERT-${year}-${String(issued + 1).padStart(4, '0')}`, certificateDate: new Date() },
    include: enrollmentInclude,
  });
  logActivity(req, `issued certificate ${updated.certificateNo} to ${e.student.name}`, 'enrollment', e.id);
  res.json(withBalance(updated));
}));

// ───── Applications from the website ─────

r.get('/applications', guard, ah(async (req, res) => {
  const status = typeof req.query.status === 'string' && req.query.status ? (req.query.status as ApplicationStatus) : undefined;
  res.json(await prisma.trainingApplication.findMany({ where: { status }, include: { course: true }, orderBy: { createdAt: 'desc' }, take: 300 }));
}));

r.patch('/applications/:id', guard, ah(async (req, res) => {
  const { status } = z.object({ status: z.nativeEnum(ApplicationStatus) }).parse(req.body);
  res.json(await prisma.trainingApplication.update({ where: { id: req.params.id }, data: { status } }));
}));

/** Accepts an application: finds or creates the student (by phone) and enrolls them in the chosen class. */
r.post('/applications/:id/accept', guard, ah(async (req, res) => {
  const { classId } = z.object({ classId: z.string() }).parse(req.body);
  const a = await prisma.trainingApplication.findUniqueOrThrow({ where: { id: req.params.id } });
  if (a.status === 'ACCEPTED') throw new HttpError(409, 'This application was already accepted');
  const cls = await prisma.trainingClass.findUniqueOrThrow({ where: { id: classId }, include: { course: true, _count: { select: { enrollments: { where: { status: 'ENROLLED' } } } } } });
  if (cls._count.enrollments >= cls.capacity) throw new HttpError(400, 'This class is full');
  const student = (await prisma.student.findFirst({ where: { phone: a.phone } }))
    ?? (await prisma.student.create({ data: { code: await nextStudentCode(), name: a.name, phone: a.phone, age: a.age, education: a.education } }));
  const existing = await prisma.enrollment.findUnique({ where: { studentId_classId: { studentId: student.id, classId } } });
  const enrollment = existing ?? (await prisma.enrollment.create({ data: { studentId: student.id, classId, fee: cls.course.fee } }));
  await prisma.trainingApplication.update({ where: { id: a.id }, data: { status: 'ACCEPTED' } });
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
