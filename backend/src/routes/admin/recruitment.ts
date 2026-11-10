import { Router } from 'express';
import { z } from 'zod';
import { ApplicantStage, PayType } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ah } from '../../lib/http';
import { requireModule } from '../../lib/auth';
import { crud } from '../../lib/crud';
import { logActivity } from '../../lib/activity';

const r = Router();
const guard = requireModule('recruitment');

r.use('/jobs', crud({
  model: 'job', module: 'recruitment', orderBy: { createdAt: 'desc' }, include: { _count: { select: { applicants: true } } },
  schema: z.object({ title: z.string().min(2), kind: z.string().default('Full time'), description: z.string().default(''), published: z.boolean().default(true) }),
}));

r.get('/applicants', guard, ah(async (req, res) => {
  const jobId = typeof req.query.jobId === 'string' && req.query.jobId ? req.query.jobId : undefined;
  res.json(await prisma.applicant.findMany({ where: { jobId }, include: { job: { select: { title: true } } }, orderBy: { createdAt: 'desc' } }));
}));

r.patch('/applicants/:id', guard, ah(async (req, res) => {
  const data = z.object({ stage: z.nativeEnum(ApplicantStage).optional(), note: z.string().optional() }).parse(req.body);
  res.json(await prisma.applicant.update({ where: { id: req.params.id }, data }));
}));

/** Hires an applicant: creates their employee record and marks them Hired. */
r.post('/applicants/:id/hire', guard, ah(async (req, res) => {
  const extra = z.object({
    department: z.string().default('Workshop'),
    payType: z.nativeEnum(PayType).default('MONTHLY'),
    rate: z.coerce.number().min(0).default(0),
  }).parse(req.body ?? {});
  const a = await prisma.applicant.findUniqueOrThrow({ where: { id: req.params.id }, include: { job: true } });
  const count = await prisma.employee.count();
  const employee = await prisma.$transaction(async (tx) => {
    const e = await tx.employee.create({
      data: { code: `DM-E${String(count + 1).padStart(3, '0')}`, name: a.name, phone: a.phone, role: a.job?.title ?? 'New hire', ...extra },
    });
    await tx.applicant.update({ where: { id: a.id }, data: { stage: 'HIRED' } });
    return e;
  });
  logActivity(req, `hired ${a.name}`, 'employee', employee.id);
  res.status(201).json(employee);
}));

export default r;
