import { Router } from 'express';
import { z } from 'zod';
import { ApplicantStage, PayType } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ah, HttpError } from '../../lib/http';
import { requireModule } from '../../lib/auth';
import { crud } from '../../lib/crud';
import { logActivity } from '../../lib/activity';
import { EMPLOYEE_CODE, withNextCode } from '../../lib/codes';
import { money, queryId, text } from '../../lib/validate';

const r = Router();
const guard = requireModule('recruitment');

r.use('/jobs', crud({
  model: 'job', module: 'recruitment', orderBy: { createdAt: 'desc' }, include: { _count: { select: { applicants: true } } },
  schema: z.object({ title: text(2, 120), kind: text(2, 40).default('Full time'), description: z.string().max(5000).default(''), published: z.boolean().default(true) }),
}));

r.get('/applicants', guard, ah(async (req, res) => {
  const jobId = queryId(req.query.jobId);
  res.json(await prisma.applicant.findMany({ where: { jobId }, include: { job: { select: { title: true } } }, orderBy: { createdAt: 'desc' } }));
}));

r.patch('/applicants/:id', guard, ah(async (req, res) => {
  const data = z.object({ stage: z.nativeEnum(ApplicantStage).optional(), note: z.string().max(3000).optional() }).parse(req.body);
  const current = await prisma.applicant.findUniqueOrThrow({ where: { id: req.params.id } });
  if (current.stage === 'HIRED' && data.stage && data.stage !== 'HIRED') throw new HttpError(400, 'This person was already hired');
  if (data.stage === 'HIRED') throw new HttpError(400, 'Use “Hire” to add them as an employee');
  const row = await prisma.applicant.update({ where: { id: current.id }, data });
  if (data.stage) logActivity(req, `moved applicant ${row.name} to ${data.stage.toLowerCase()}`, 'applicant', row.id);
  res.json(row);
}));

/** Hires an applicant: creates their employee record and marks them Hired. */
r.post('/applicants/:id/hire', guard, ah(async (req, res) => {
  const extra = z.object({
    department: text(2, 80).default('Workshop'),
    payType: z.nativeEnum(PayType).default('MONTHLY'),
    rate: money.default(0),
  }).parse(req.body ?? {});
  const a = await prisma.applicant.findUniqueOrThrow({ where: { id: req.params.id }, include: { job: true } });
  if (a.stage === 'HIRED') throw new HttpError(409, 'This person was already hired');
  const employee = await withNextCode(EMPLOYEE_CODE, (code) => prisma.$transaction(async (tx) => {
    const claimed = await tx.applicant.updateMany({ where: { id: a.id, stage: { not: 'HIRED' } }, data: { stage: 'HIRED' } });
    if (claimed.count === 0) throw new HttpError(409, 'This person was just hired by someone else');
    return tx.employee.create({ data: { code, name: a.name, phone: a.phone, role: a.job?.title ?? 'New hire', ...extra } });
  }));
  logActivity(req, `hired ${a.name}`, 'employee', employee.id);
  res.status(201).json(employee);
}));

export default r;
