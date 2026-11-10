'use client';

import { motion } from 'framer-motion';
import { etb, gcDate, label } from '@/lib/format';
import { Bar, ErrorNote, Loading, PageHeader, Pill, Stat, useApi } from '@/components/admin/ui';
import ResourceManager from '@/components/admin/ResourceManager';

interface Summary {
  series: { period: string; label: string; income: number; expense: number }[];
  current: { label: string; income: number; expense: number };
  expensesByCategory: { category: string; amount: number }[];
  incomeByMethod: { method: string; amount: number }[];
  owed: number;
}
interface Tx { id: string; kind: string; category: string; amount: string; method: string; description: string; date: string; [k: string]: unknown }

const CATEGORIES = ['Order payment', 'Model booking', 'Show tickets', 'Fabric & materials', 'Salaries & payroll', 'Rent', 'Electricity & water', 'Fashion show costs', 'Transport', 'Marketing', 'Other'];

export default function FinancePage() {
  const { data, error, loading, reload } = useApi<Summary>('/admin/finance/summary?months=6');
  const max = Math.max(1, ...(data?.series.flatMap((s) => [s.income, s.expense]) ?? [1]));
  const topExpense = Math.max(1, ...(data?.expensesByCategory.map((e) => e.amount) ?? [1]));
  const incomeTotal = data?.incomeByMethod.reduce((s, m) => s + m.amount, 0) ?? 0;

  return (
    <>
      <PageHeader title="Finance & reports" sub="Money in and out, in Birr, by Ethiopian month." />
      <ErrorNote error={error} />
      {loading && !data ? <Loading /> : data && (
        <>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3.5">
            <Stat label={`Income · ${data.current.label}`} value={etb(data.current.income)} tone="good" />
            <Stat label={`Expenses · ${data.current.label}`} value={etb(data.current.expense)} />
            <Stat label={`Profit · ${data.current.label}`} value={etb(data.current.income - data.current.expense)} tone={data.current.income >= data.current.expense ? 'good' : 'bad'} />
            <Stat label="Customers still owe" value={etb(data.owed)} tone={data.owed ? 'bad' : 'good'} />
          </div>
          <div className="flex flex-wrap gap-4">
            <section className="card flex-[2_1_520px]">
              <h2 className="mb-4 flex flex-wrap justify-between gap-2 font-display text-[17px] font-bold">Income vs expenses
                <span className="flex gap-3.5 font-sans text-[13px] font-medium"><span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-teal" />Income</span><span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-gold-admin" />Expenses</span></span>
              </h2>
              <div role="img" aria-label={data.series.map((s) => `${s.label}: income ${etb(s.income)}, expenses ${etb(s.expense)}`).join('; ')} className="grid h-60 grid-cols-6 items-end gap-3 border-b border-[#C9D5E8] px-1">
                {data.series.map((s, i) => (
                  <div key={s.period} className="flex h-full items-end justify-center gap-1" title={`${s.label}: income ${etb(s.income)}, expenses ${etb(s.expense)}`}>
                    <motion.div className="w-5 rounded-t bg-teal" initial={{ height: 0 }} animate={{ height: `${(s.income / max) * 100}%` }} transition={{ delay: i * 0.06, duration: 0.6 }} />
                    <motion.div className="w-5 rounded-t bg-gold-admin" initial={{ height: 0 }} animate={{ height: `${(s.expense / max) * 100}%` }} transition={{ delay: i * 0.06 + 0.05, duration: 0.6 }} />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-6 gap-3 px-1 pt-2 text-center text-[13px] text-muted">{data.series.map((s) => <span key={s.period}>{s.label.split(' ')[0]}</span>)}</div>
            </section>
            <section className="card flex flex-[1_1_300px] flex-col gap-3">
              <h2 className="font-display text-[17px] font-bold">Where money goes · {data.current.label}</h2>
              {data.expensesByCategory.length === 0 ? <p className="text-sm text-muted">No expenses this month.</p> : data.expensesByCategory.map((e) => (
                <div key={e.category} className="flex flex-col gap-1 text-sm"><div className="flex justify-between"><span>{e.category}</span><span className="font-semibold">{etb(e.amount)}</span></div><Bar pct={(e.amount / topExpense) * 100} color="bg-ink-soft" /></div>
              ))}
              {incomeTotal > 0 && (
                <p className="mt-2 border-t border-[#ECF1F8] pt-3 text-[13px] text-muted">Paid by: {data.incomeByMethod.map((m) => `${label(m.method)} ${Math.round((m.amount / incomeTotal) * 100)}%`).join(' · ')}</p>
              )}
            </section>
          </div>
        </>
      )}
      <ResourceManager<Tx> endpoint="/admin/finance/transactions" noun="transaction" title="Transactions"
        columns={[
          { label: 'Date', render: (t) => gcDate(t.date) },
          { label: 'Description', render: (t) => <span className="font-semibold">{t.description || t.category}</span> },
          { label: 'Category', render: (t) => t.category },
          { label: 'Method', render: (t) => label(t.method) },
          { label: 'Amount', render: (t) => <span className={t.kind === 'INCOME' ? 'font-semibold text-[#1E6B34]' : 'font-semibold text-[#9B1C14]'}>{t.kind === 'INCOME' ? '+' : '−'} {etb(t.amount)}</span> },
          { label: 'Kind', render: (t) => <Pill tone={t.kind === 'INCOME' ? 'green' : 'red'}>{label(t.kind)}</Pill> },
        ]}
        fields={[
          { name: 'kind', label: 'Money in or out', type: 'select', required: true, options: [{ value: 'INCOME', label: 'Income' }, { value: 'EXPENSE', label: 'Expense' }] },
          { name: 'category', label: 'Category', type: 'select', required: true, options: CATEGORIES.map((c) => ({ value: c, label: c })) },
          { name: 'amount', label: 'Amount (ETB)', type: 'number', required: true },
          { name: 'method', label: 'Method', type: 'select', required: true, options: [{ value: 'TELEBIRR', label: 'Telebirr' }, { value: 'CBE_BIRR', label: 'CBE Birr' }, { value: 'BANK', label: 'Bank transfer' }, { value: 'CASH', label: 'Cash' }] },
          { name: 'date', label: 'Date', type: 'date', required: true },
          { name: 'description', label: 'Description', full: true },
        ]}
        defaults={{ kind: 'EXPENSE', category: 'Fabric & materials', method: 'CASH', date: new Date().toISOString() }}
        onChange={reload}
      />
      <section className="card">
        <h2 className="mb-2 font-display text-[17px] font-bold">Reports</h2>
        <p className="mb-3 text-sm text-muted">Print this page (Ctrl + P) for a monthly summary. Excel export of transactions is planned for the next version.</p>
        <button type="button" onClick={() => window.print()} className="a-btn a-btn-line">Print summary</button>
      </section>
    </>
  );
}
