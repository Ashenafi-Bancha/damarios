/**
 * Records the API's answers for the public site and every staff-panel screen into
 * frontend/src/lib/demo-data.json, which the frontend's demo mode (NEXT_PUBLIC_DEMO=true) uses.
 *
 * Run it after changing website text, products, courses, gallery or news, with the database and the API running:
 *   npm run demo:record
 * It signs in with a temporary throwaway account and deletes that account when it finishes.
 */
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const backend = path.resolve(__dirname, '..');
const req = (m) => require(m);
req('dotenv').config({ path: path.join(backend, '.env') });
const { PrismaClient } = req('@prisma/client');
const bcrypt = req('bcryptjs');
const prisma = new PrismaClient();
const API = 'http://127.0.0.1:4000/api';
const out = process.argv[2] || path.resolve(backend, '../frontend/src/lib/demo-data.json');

(async () => {
  const email = 'capture-' + crypto.randomBytes(4).toString('hex') + '@local.test';
  const pw = crypto.randomBytes(18).toString('base64url');
  const user = await prisma.user.create({ data: { email, name: 'Admin', role: 'OWNER', passwordHash: await bcrypt.hash(pw, 10) } });
  try {
    const login = await fetch(API + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: pw }) });
    if (!login.ok) throw new Error('login failed ' + login.status);
    const cookie = login.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
    const get = async (p) => { const r = await fetch(API + p, { headers: { cookie } }); if (!r.ok) throw new Error(p + ' ' + r.status + ' ' + await r.text()); return r.json(); };
    const today = new Date().toISOString().slice(0, 10);
    const paths = [
      '/auth/me', '/admin/dashboard', '/admin/customers', '/admin/content?lang=en', '/admin/content?lang=am', '/admin/content?lang=wal',
      '/admin/news', '/admin/subscribers', '/admin/users', '/admin/permissions', '/admin/activity', '/admin/settings',
      '/admin/orders', '/admin/requests',
      '/admin/production/lines', '/admin/production/output', '/admin/production/products',
      '/admin/people/employees', '/admin/people/attendance?date=' + today, '/admin/people/leave', '/admin/people/payroll',
      '/admin/inventory/items', '/admin/inventory/suppliers', '/admin/inventory/movements',
      '/admin/fashion/designs', '/admin/fashion/models', '/admin/fashion/events', '/admin/fashion/bookings', '/admin/fashion/collections', '/admin/fashion/looks', '/admin/fashion/gallery',
      '/admin/finance/summary?months=6', '/admin/finance/transactions',
      '/admin/recruitment/jobs', '/admin/recruitment/applicants',
      '/admin/training/summary', '/admin/training/applications', '/admin/training/classes', '/admin/training/courses', '/admin/training/enrollments', '/admin/training/students',
      '/public/site?lang=en',
    ];
    const data = {};
    for (const p of paths) data[p.split('?')[0] + (p.includes('lang=') ? '?' + p.split('?')[1] : '')] = await get(p);
    data['/admin/people/attendance'] = data['/admin/people/attendance?date=' + today] ?? data['/admin/people/attendance'];
    const current = data['/admin/people/payroll'].current;
    data['/admin/people/payroll/:period'] = await get('/admin/people/payroll/' + current);
    // Demo identity: no real names or emails in the bundle.
    data['/auth/me'] = { ...data['/auth/me'], id: 'demo-admin', email: 'admin@damarios.demo', name: 'Admin' };
    data['/admin/users'] = [{ id: 'demo-admin', name: 'Admin', email: 'admin@damarios.demo', phone: null, role: 'OWNER', active: true, lastActiveAt: new Date().toISOString(), createdAt: new Date().toISOString() }];
    data['/admin/activity'] = [];
    fs.writeFileSync(out, JSON.stringify(data, null, 1));
    console.log(`Recorded ${Object.keys(data).length} answers into ${out}`);
  } finally {
    await prisma.activityLog.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
    console.log('temporary login removed');
    await prisma.$disconnect();
  }
})().catch((e) => { console.error(e.message); process.exit(1); });
