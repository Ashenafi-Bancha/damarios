import { Router } from 'express';
import type { ZodObject, ZodRawShape, ZodTypeAny } from 'zod';
import { prisma } from './prisma';
import { ah } from './http';
import { requireModule } from './auth';
import { logActivity } from './activity';
import type { ModuleName } from './modules';

interface CrudOptions {
  /** Prisma model name in camelCase, e.g. "customer". */
  model: string;
  module: ModuleName;
  /** Rules for a new record. */
  schema: ZodObject<ZodRawShape>;
  /** Rules for an edit; by default the same rules with every field optional. */
  updateSchema?: (schema: ZodObject<ZodRawShape>) => ZodTypeAny;
  orderBy?: Record<string, 'asc' | 'desc'>;
  include?: Record<string, unknown>;
  /** Text fields searched by ?q= */
  search?: string[];
  /** Fields that can be filtered exactly, e.g. ?category=FABRIC (unknown values give a 400). */
  filters?: string[];
  /** Extra rules across fields, run after the schema on create and edit; throw an HttpError to reject. */
  check?: (data: Record<string, unknown>) => void;
}

/** Standard list / get / create / update / delete routes for a simple resource. */
export function crud(opts: CrudOptions) {
  const r = Router();
  // Prisma delegates share the same method shapes; a generic handle keeps this factory small.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const delegate = (prisma as any)[opts.model];
  const guard = requireModule(opts.module);
  const updateSchema = opts.updateSchema ? opts.updateSchema(opts.schema) : opts.schema.partial();

  r.get('/', guard, ah(async (req, res) => {
    const where: Record<string, unknown> = {};
    const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : '';
    if (q && opts.search?.length) {
      where.OR = opts.search.map((f) => ({ [f]: { contains: q, mode: 'insensitive' } }));
    }
    for (const f of opts.filters ?? []) {
      const v = req.query[f];
      if (typeof v === 'string' && v) where[f] = v === 'true' ? true : v === 'false' ? false : v.slice(0, 60);
    }
    const rows = await delegate.findMany({ where, orderBy: opts.orderBy, include: opts.include, take: 500 });
    res.json(rows);
  }));

  r.get('/:id', guard, ah(async (req, res) => {
    res.json(await delegate.findUniqueOrThrow({ where: { id: req.params.id }, include: opts.include }));
  }));

  r.post('/', guard, ah(async (req, res) => {
    const data = opts.schema.parse(req.body);
    opts.check?.(data);
    const row = await delegate.create({ data, include: opts.include });
    logActivity(req, `created ${opts.model}`, opts.model, row.id);
    res.status(201).json(row);
  }));

  r.patch('/:id', guard, ah(async (req, res) => {
    const data = updateSchema.parse(req.body);
    opts.check?.(data);
    const row = await delegate.update({ where: { id: req.params.id }, data, include: opts.include });
    logActivity(req, `updated ${opts.model}`, opts.model, row.id);
    res.json(row);
  }));

  r.delete('/:id', guard, ah(async (req, res) => {
    await delegate.delete({ where: { id: req.params.id } });
    logActivity(req, `deleted ${opts.model}`, opts.model, req.params.id);
    res.status(204).end();
  }));

  return r;
}
