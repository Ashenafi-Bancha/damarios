/**
 * Seeds the database.
 * Always: the owner account, role permissions, settings and website text.
 * Sample business data (orders, staff, courses, students…) too, unless SEED_SAMPLE=false.
 * Run with: npm run db:seed
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient, Role, TrainingDept } from '@prisma/client';
import { DEFAULT_PERMISSIONS } from '../src/lib/modules';

const prisma = new PrismaClient();

/** Website text for each section. Words between *stars* show in gold italics. */
const CONTENT: Record<string, [string, string]> = {
  hero: ['Heritage we *weave*. Skills we *pass on*.', 'DaMarios produces garments and spices for local and international markets, and trains the next generation in fashion design, culinary arts and beautification.'],
  about: ['Ethiopian weaving, *made modern*.', 'Ethiopia has a rich weaving heritage and a great potential that is still largely untapped. DaMarios was founded to take this beautiful, overlooked handcraft to a higher level by blending it with modern design. Working with the natural talent and skill of local weavers, we make quality products that meet today’s fashion, and our training center passes these skills on to the next generation. Our work keeps our cultural heritage alive, creates better jobs and income for our artisans, and carries Ethiopia’s name onto the international stage.'],
  vision: ['From the loom *to the world*.', 'Our vision is to transform Ethiopia’s under-valued weaving sector into a modern, high-quality creative industry that is ready for the international market.'],
  production: ['Made in Wolaita Sodo, *for the world*.', 'Two production lines under one roof: garments and Ethiopian spices, for local customers and international buyers.'],
  garments: ['Garments for local & international markets', 'Ethiopian handwoven fabric and Wolaita dinguza, made into modern garments for local, international and diaspora customers. Quality checked at every step, with capacity for bulk and export orders.'],
  spices: ['Ethiopian spices, cleaned, ground & packed', '[Which spices, how they are sourced and processed.] Packed in retail and wholesale sizes for shops, restaurants and export.'],
  enquiry: ['Buy from *DaMarios*.', 'Shops, restaurants, distributors, international buyers and the Ethiopian diaspora: tell us what you need and we will send a quotation.'],
  training: ['Learn a skill. *Build a future.*', 'Hands-on training by working professionals, in real workshops, with a certificate at the end.'],
  'dept-fashion': ['Fashion design', 'From drawing and pattern making to cutting, sewing and finishing. Students practise in our own garment workshop.'],
  'dept-culinary': ['Culinary arts', 'Ethiopian and international cooking, baking and kitchen hygiene, with practice in a real training kitchen.'],
  'dept-beauty': ['Beautification', 'Professional makeup, bridal looks, hair cutting, braiding and styling, plus how to run your own salon.'],
  admissions: ['Apply in *four steps*.', 'Next intake: [Date]. Registration fee: ETB [·], payable by Telebirr, CBE Birr or cash.'],
  gallery: ['Inside *DaMarios*.', ''],
  news: ['Stories from *the center*.', ''],
  contact: ['Visit *DaMarios*.', ''],
};

async function base() {
  const email = (process.env.SEED_OWNER_EMAIL || 'owner@damarios.local').toLowerCase();
  const password = process.env.SEED_OWNER_PASSWORD;
  if (!password || password.length < 8) throw new Error('Set SEED_OWNER_PASSWORD (8+ characters) in .env before seeding.');
  await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name: 'Dr. Senait Mario', role: 'OWNER', passwordHash: await bcrypt.hash(password, 12) },
  });

  for (const [role, modules] of Object.entries(DEFAULT_PERMISSIONS)) {
    for (const module of modules) {
      await prisma.rolePermission.upsert({ where: { role_module: { role: role as Role, module } }, update: {}, create: { role: role as Role, module } });
    }
  }

  const settings: Record<string, unknown> = {
    openingDate: '2027-01-15',
    contact: {
      phone: '+251 [sales phone]', trainingPhone: '+251 [training phone]', email: 'info@[domain]', telegram: '@[damarios]',
      address: '[Kebele / landmark], Wolaita Sodo, Ethiopia', hours: 'Mon–Sat · 8:00–18:00',
      instagram: '', tiktok: '', facebook: '', youtube: '', mapUrl: '',
    },
    business: { name: 'DaMarios Garment and Skill Training Center', nameAm: 'ዳማሪዮስ ጋርመንት እና የሙያ ስልጠና ማዕከል', tin: '', licence: '', startTime: '08:00', workingDays: 'Monday – Saturday' },
    // Confirm these with the company's accountant. Tax brackets are left empty on purpose.
    payroll: { pensionEmployee: 7, pensionEmployer: 11, overtimeMultiplier: 1.5, brackets: [] },
    calendar: { main: 'ethiopian', showGregorian: true, adminLanguage: 'en' },
    payments: { telebirr: '', cbeBirr: '', bank: '', depositPercent: 50 },
    notifications: { newRequest: true, newApplication: true, lowStock: true, overdue: true, dailySummary: false, payment: true },
  };
  for (const [key, value] of Object.entries(settings)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await prisma.setting.upsert({ where: { key }, update: {}, create: { key, value: value as any } });
  }

  for (const [section, [headline, body]] of Object.entries(CONTENT)) {
    await prisma.siteContent.upsert({ where: { section_lang: { section, lang: 'en' } }, update: {}, create: { section, lang: 'en', headline, body } });
  }
  console.log(`Owner account: ${email}`);
}

async function sample() {
  if ((await prisma.order.count()) > 0) return console.log('Sample data already present, skipped.');

  // Products shown on the website (placeholders until the owner confirms the list).
  await prisma.product.createMany({ data: [
    { name: '[Garment product]', division: 'GARMENT', description: 'Ready-to-wear for the local market.', markets: 'Local', sortOrder: 1 },
    { name: '[Garment product]', division: 'GARMENT', description: 'Bulk and private-label production.', markets: 'Local · Export', sortOrder: 2 },
    { name: '[Garment product]', division: 'GARMENT', description: 'Cultural garments.', markets: 'Local · Export', sortOrder: 3 },
    { name: '[e.g. Berbere]', division: 'SPICE', description: 'Cleaned, ground and packed.', packSizes: '250 g · 500 g · 1 kg · bulk', markets: 'Retail · Wholesale · Export', sortOrder: 4 },
    { name: '[e.g. Mitmita]', division: 'SPICE', description: 'Cleaned, ground and packed.', packSizes: '100 g · 250 g · bulk', markets: 'Retail · Wholesale', sortOrder: 5 },
    { name: '[e.g. Shiro]', division: 'SPICE', description: 'Roasted and milled.', packSizes: '500 g · 1 kg · bulk', markets: 'Retail · Wholesale · Export', sortOrder: 6 },
  ] });

  // Training courses and classes.
  const courses: [string, TrainingDept, string, number][] = [
    ['Basic sewing & tailoring', 'FASHION', '[3 months]', 6000], ['Pattern making & design', 'FASHION', '[6 months]', 9000], ['Advanced fashion design', 'FASHION', '[1 year]', 15000],
    ['Basic cooking & food safety', 'CULINARY', '[3 months]', 6000], ['Pastry & baking', 'CULINARY', '[4 months]', 7000], ['Professional chef course', 'CULINARY', '[1 year]', 15000],
    ['Makeup artistry', 'BEAUTY', '[3 months]', 6500], ['Hairdressing & braiding', 'BEAUTY', '[4 months]', 8000], ['Salon business basics', 'BEAUTY', '[1 month]', 2500],
  ];
  const created = [];
  for (const [i, [name, department, duration, fee]] of courses.entries()) {
    created.push(await prisma.course.create({ data: { name, department, duration, fee, sortOrder: i } }));
  }
  const day = 86400000;
  const cls = await Promise.all([
    prisma.trainingClass.create({ data: { courseId: created[0].id, name: 'Morning group', instructor: '[Instructor]', schedule: 'Mon–Fri 8:30–11:30', capacity: 20, startDate: new Date(Date.now() - 40 * day), endDate: new Date(Date.now() + 50 * day) } }),
    prisma.trainingClass.create({ data: { courseId: created[3].id, name: 'Morning group', instructor: '[Instructor]', schedule: 'Mon–Fri 8:30–12:00', capacity: 16, startDate: new Date(Date.now() - 30 * day), endDate: new Date(Date.now() + 60 * day) } }),
    prisma.trainingClass.create({ data: { courseId: created[6].id, name: 'Afternoon group', instructor: '[Instructor]', schedule: 'Mon–Fri 14:00–17:00', capacity: 12, startDate: new Date(Date.now() - 90 * day), endDate: new Date(Date.now() - 2 * day) } }),
    prisma.trainingClass.create({ data: { courseId: created[7].id, name: 'Weekend group', instructor: '[Instructor]', schedule: 'Sat–Sun 9:00–15:00', capacity: 18, startDate: new Date(Date.now() + 10 * day), endDate: new Date(Date.now() + 130 * day) } }),
  ]);
  const students = await Promise.all([1, 2, 3, 4].map((n) => prisma.student.create({ data: { code: `DM-S2026-000${n}`, name: '[Student name]', phone: `090000010${n}` } })));
  const e1 = await prisma.enrollment.create({ data: { studentId: students[0].id, classId: cls[0].id, fee: 6000 } });
  await prisma.enrollment.create({ data: { studentId: students[1].id, classId: cls[1].id, fee: 6000 } });
  const e3 = await prisma.enrollment.create({ data: { studentId: students[2].id, classId: cls[2].id, fee: 6500, attendancePct: 96, result: 'Pass' } });
  await prisma.enrollment.create({ data: { studentId: students[3].id, classId: cls[2].id, fee: 6500, attendancePct: 88 } });
  await prisma.feePayment.create({ data: { enrollmentId: e1.id, amount: 3000, method: 'TELEBIRR' } });
  await prisma.feePayment.create({ data: { enrollmentId: e3.id, amount: 6500, method: 'CBE_BIRR' } });
  await prisma.transaction.create({ data: { kind: 'INCOME', category: 'Training fees', amount: 9500, method: 'TELEBIRR', description: 'Training fees (sample)' } });
  await prisma.trainingApplication.createMany({ data: [
    { department: 'FASHION', courseId: created[0].id, name: '[Applicant name]', phone: '0900000201', preferredTime: 'Morning', education: 'Grade 12 complete', age: 19 },
    { department: 'BEAUTY', courseId: created[6].id, name: '[Applicant name]', phone: '0900000202', preferredTime: 'Afternoon', education: 'Grade 8–10', age: 22 },
    { department: 'CULINARY', courseId: created[5].id, name: '[Applicant name]', phone: '0900000203', preferredTime: 'Weekend', education: 'TVET / diploma', age: 25 },
  ] });

  await prisma.newsPost.createMany({ data: [
    { title: 'Registration open for all three departments', kind: 'New intake', body: '[Details of the next intake.]', imageUrl: '/images/news-intake.jpg' },
    { title: 'First graduation ceremony', kind: 'Graduation', body: '[Photos and names of the graduates.]', date: new Date(Date.now() - 20 * day), imageUrl: '/images/news-graduation.jpg' },
    { title: '[First export shipment / market fair]', kind: 'Production', body: '[Details.]', date: new Date(Date.now() - 45 * day), imageUrl: '/images/news-market.jpg' },
  ] });
  await prisma.galleryItem.createMany({ data: [
    { title: 'Garment production line', category: 'GARMENTS', tall: true, imageUrl: '/images/gallery-tailor.jpg' }, { title: 'Spice cleaning & grinding', category: 'SPICES', imageUrl: '/images/gallery-chili.jpg' },
    { title: 'Fashion students at work', category: 'TRAINING', imageUrl: '/images/gallery-studio.jpg' }, { title: 'Culinary class', category: 'TRAINING', imageUrl: '/images/gallery-chef.jpg' },
    { title: 'Packed spices ready for market', category: 'SPICES', tall: true, imageUrl: '/images/gallery-spice-shop.jpg' }, { title: 'Bridal makeup practice', category: 'TRAINING', tall: true, imageUrl: '/images/gallery-makeup.jpg' },
    { title: 'Finished garments', category: 'GARMENTS', imageUrl: '/images/gallery-fabric.jpg' }, { title: 'Graduation day', category: 'EVENTS', imageUrl: '/images/gallery-graduation.jpg' },
  ] });

  await prisma.job.create({ data: { title: 'Sewing machine operator', description: 'Industrial machine experience preferred.' } });
  await prisma.job.create({ data: { title: 'Culinary instructor', description: 'Professional chef with teaching experience.' } });

  const [garmentLine, cutting, spiceLine] = await Promise.all([
    prisma.productionLine.create({ data: { name: 'Garment line 1', division: 'GARMENT', workers: 8 } }),
    prisma.productionLine.create({ data: { name: 'Cutting', division: 'GARMENT', workers: 4 } }),
    prisma.productionLine.create({ data: { name: 'Spice processing', division: 'SPICE', workers: 5 } }),
  ]);
  const employees = await Promise.all([
    prisma.employee.create({ data: { code: 'DM-E001', name: '[Name]', role: 'Production manager', department: 'Office', rate: 0 } }),
    prisma.employee.create({ data: { code: 'DM-E002', name: '[Name]', role: 'Machine operator', department: 'Garment line 1', payType: 'PIECE_RATE', rate: 0 } }),
    prisma.employee.create({ data: { code: 'DM-E003', name: '[Name]', role: 'Spice processor', department: 'Spice processing', rate: 0 } }),
    prisma.employee.create({ data: { code: 'DM-E004', name: '[Name]', role: 'Fashion design instructor', department: 'Training center', rate: 0 } }),
  ]);

  const fabric = await prisma.supplier.create({ data: { name: '[Fabric supplier]', location: 'Addis Ababa', supplies: 'Cotton, polyester, linen' } });
  const farm = await prisma.supplier.create({ data: { name: '[Spice farmers / traders]', location: 'Wolaita', supplies: 'Raw chilli, garlic, ginger, korerima' } });
  await prisma.inventoryItem.createMany({ data: [
    { name: 'Cotton fabric', category: 'FABRIC', unit: 'm', quantity: 120, minLevel: 200, supplierId: fabric.id },
    { name: 'Polyester thread, assorted', category: 'THREAD', unit: 'cones', quantity: 80, minLevel: 40 },
    { name: 'Buttons & zippers', category: 'TRIMS', unit: 'pcs', quantity: 2500, minLevel: 1000 },
    { name: 'Dried red chilli (raw)', category: 'RAW_SPICE', unit: 'kg', quantity: 60, minLevel: 150, supplierId: farm.id },
    { name: 'Berbere, 500 g packs', category: 'PACKED_SPICE', unit: 'packs', quantity: 340, minLevel: 200 },
    { name: 'Spice pouches with DaMarios label', category: 'PACKAGING', unit: 'pcs', quantity: 1500, minLevel: 1000 },
    { name: 'Training fabric & notions', category: 'TRAINING_SUPPLIES', unit: 'sets', quantity: 25, minLevel: 20 },
  ] });

  const shop = await prisma.customer.create({ data: { name: '[Shop name]', type: 'BUSINESS', phone: '0911000001', notes: 'Wholesale spice buyer' } });
  const buyer = await prisma.customer.create({ data: { name: '[International buyer]', type: 'BUSINESS', email: 'buyer@example.com', notes: 'Country: [Country]' } });
  const o1 = await prisma.order.create({ data: { code: 'DM-0101', customerId: shop.id, type: 'WHOLESALE', stage: 'IN_PRODUCTION', title: 'Berbere · 200 kg in 1 kg packs', quantity: 200, total: 90000, dueDate: new Date(Date.now() + 9 * day), events: { create: [{ text: 'Enquiry received from the website' }, { text: 'Moved to In production' }] } } });
  await prisma.order.create({ data: { code: 'DM-0102', customerId: buyer.id, type: 'EXPORT', stage: 'QUOTED', title: 'Garments · 2,000 pcs (export)', quantity: 2000, total: 0, notes: 'Quote in USD' } });
  await prisma.transaction.create({ data: { kind: 'INCOME', category: 'Order payment', amount: 45000, method: 'BANK', orderId: o1.id, description: 'Deposit · DM-0101' } });
  await prisma.transaction.create({ data: { kind: 'EXPENSE', category: 'Raw spices', amount: 18000, method: 'CASH', description: 'Dried red chilli' } });

  const wo = await prisma.workOrder.create({ data: { lineId: spiceLine.id, orderId: o1.id, title: 'Berbere for [Shop name]', unit: 'kg', target: 200, done: 80, status: 'ON_TRACK', dueDate: new Date(Date.now() + 9 * day) } });
  await prisma.workOrder.create({ data: { lineId: garmentLine.id, title: '[Garment product] · local stock', target: 300, done: 120, status: 'ON_TRACK' } });
  await prisma.workOrder.create({ data: { lineId: cutting.id, title: '[Garment product] · cutting', target: 300, done: 210, status: 'ON_TRACK' } });
  await prisma.outputLog.create({ data: { workOrderId: wo.id, employeeId: employees[2].id, pieces: 20, defects: 0 } });

  await prisma.request.create({ data: { type: 'EXPORT', name: '[Buyer contact]', phone: '', email: 'sourcing@example.com', company: '[Importer company]', country: '[Country]', product: 'Spices', quantity: '[1 tonne]', currency: 'USD', message: 'Looking for a regular supplier of berbere.' } });
  console.log('Sample data added.');
}

base()
  .then(() => (process.env.SEED_SAMPLE === 'false' ? undefined : sample()))
  .then(() => console.log('Seed finished.'))
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
