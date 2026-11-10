import type { Request } from 'express';
import { prisma } from './prisma';

/** Records who did what, for the activity log in Users & roles. Never blocks the request. */
export function logActivity(req: Request, action: string, entity?: string, entityId?: string) {
  prisma.activityLog
    .create({ data: { userId: req.user?.id, action, entity, entityId } })
    .catch((e) => console.error('activity log failed', e));
}
