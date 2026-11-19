/**
 * Readable reference numbers: orders DM-0101, employees DM-E001, students DM-S2026-0001, certificates DM-CERT-2026-0001.
 *
 * The next number is one more than the highest already used with that prefix (not a row count, which repeats
 * after deletions). If two people save at the same moment and get the same number, the database's unique
 * index rejects the second one and it is retried with the next number.
 */
import { Prisma } from '@prisma/client';
import { prisma } from './prisma';

type CodeTable = 'order' | 'employee' | 'student' | 'enrollment';

async function highest(table: CodeTable, field: 'code' | 'certificateNo', prefix: string): Promise<number> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: { value: string | null }[] = await (prisma as any)[table].findMany({
    where: { [field]: { startsWith: prefix } },
    select: { [field]: true },
  }).then((r: Record<string, string | null>[]) => r.map((x) => ({ value: x[field] })));
  let max = 0;
  for (const r of rows) {
    const n = parseInt((r.value ?? '').slice(prefix.length), 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return max;
}

/** Creates a record with the next free code, retrying if someone else took it at the same moment. */
export async function withNextCode<T>(
  opts: { table: CodeTable; field?: 'code' | 'certificateNo'; prefix: string; pad: number; start?: number },
  create: (code: string) => Promise<T>,
): Promise<T> {
  const field = opts.field ?? 'code';
  for (let attempt = 0; attempt < 5; attempt++) {
    const n = Math.max(await highest(opts.table, field, opts.prefix), opts.start ?? 0) + 1 + attempt;
    try {
      return await create(`${opts.prefix}${String(n).padStart(opts.pad, '0')}`);
    } catch (e) {
      const clash = e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002';
      if (!clash || attempt === 4) throw e;
    }
  }
  throw new Error('Could not find a free code');
}

export const ORDER_CODE = { table: 'order' as const, prefix: 'DM-', pad: 4, start: 100 };
export const EMPLOYEE_CODE = { table: 'employee' as const, prefix: 'DM-E', pad: 3 };
export const studentCode = () => ({ table: 'student' as const, prefix: `DM-S${new Date().getFullYear()}-`, pad: 4 });
export const certificateCode = () => ({ table: 'enrollment' as const, field: 'certificateNo' as const, prefix: `DM-CERT-${new Date().getFullYear()}-`, pad: 4 });
