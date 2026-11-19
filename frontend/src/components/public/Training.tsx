'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';
import { Check, Loader2 } from 'lucide-react';
import { useBlock, useSite } from './SiteContext';
import { Headline } from './Sections';
import Reveal from './Reveal';
import Photo from './Photo';
import { api } from '@/lib/api';
import { isPhone, PHONE_PATTERN } from '@/lib/forms';
import { etb } from '@/lib/format';
import type { TrainingDept } from '@/lib/types';

export const DEPTS: { id: TrainingDept; key: string; short: string; shortAm: string; photo: string; photoAm: string }[] = [
  { id: 'FASHION', key: 'dept-fashion', short: 'Pattern making, sewing, design', shortAm: 'ፓተርን አሠራር፣ ስፌት፣ ዲዛይን', photo: 'Student drafting a garment pattern with a ruler', photoAm: 'በማስመሪያ የልብስ ፓተርን የምትሠራ ሠልጣኝ' },
  { id: 'CULINARY', key: 'dept-culinary', short: 'Ethiopian & international cooking', shortAm: 'የኢትዮጵያ እና የዓለም አቀፍ ምግብ ዝግጅት', photo: 'Cook smiling at the stove in a kitchen', photoAm: 'በኩሽና ውስጥ ምድጃ አጠገብ ፈገግ ያለ ምግብ አብሳይ' },
  { id: 'BEAUTY', key: 'dept-beauty', short: 'Makeup & hairdressing', shortAm: 'ሜካፕ እና የፀጉር ሥራ', photo: 'Woman smiling while her hair is braided', photoAm: 'ፀጉሯ እየተሠራ ፈገግ ያለች ሴት' },
];

const fee = (f: string | number, am = false) => (Number(f) > 0 ? etb(f) : am ? 'ብር [·]' : 'ETB [·]');

export function Training() {
  const { site, dept, setDept, startApply, tx, lang } = useSite();
  const am = lang === 'am';
  const block = useBlock('training');
  const blocks = { FASHION: useBlock('dept-fashion'), CULINARY: useBlock('dept-culinary'), BEAUTY: useBlock('dept-beauty') };
  const current = DEPTS.find((d) => d.id === dept)!;
  const courses = site.courses.filter((c) => c.department === dept);

  return (
    <section id="training" className="section">
      <div className="wrap">
        <Reveal className="mb-10 flex flex-wrap items-end justify-between gap-5">
          <div><p className="eyebrow text-teal">02 · {tx('Skill training center', 'የክህሎት ማሠልጠኛ ማዕከል')}</p><Headline text={block.headline} /></div>
          <p className="lead max-w-[440px] text-muted">{block.body}</p>
        </Reveal>

        <div role="tablist" aria-label={tx('Departments', 'የስልጠና ክፍሎች')} className="mb-6 grid gap-3 sm:grid-cols-3">
          {DEPTS.map((d, i) => (
            <button key={d.id} type="button" role="tab" aria-selected={dept === d.id} onClick={() => setDept(d.id)}
              className={clsx('flex flex-col gap-1.5 rounded-[10px] border-[1.5px] px-5 py-5 text-left transition-colors', dept === d.id ? 'border-teal bg-teal text-white' : 'border-ivory-line bg-white hover:border-teal')}>
              <span className="text-[11px] font-semibold tracking-[.2em] opacity-80">0{i + 1}</span>
              <span className="font-serif text-[28px] leading-none md:text-[30px]">{blocks[d.id].headline}</span>
              <span className="text-[13px] opacity-80">{am ? d.shortAm : d.short}</span>
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={dept} role="tabpanel" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35 }}
            className="flex flex-wrap overflow-hidden rounded-[10px] bg-white">
            <Photo src={`/images/${current.key}.jpg`} label={am ? current.photoAm : current.photo} sizes="(min-width: 1024px) 45vw, 100vw" className="min-h-[300px] flex-[1_1_440px] md:min-h-[460px]" />
            <div className="flex flex-[1.2_1_480px] flex-col gap-4 p-7 md:p-10">
              <h3 className="font-serif text-[36px] font-medium md:text-[40px]">{blocks[dept].headline}</h3>
              <p className="leading-relaxed text-muted">{blocks[dept].body}</p>
              <ul>
                {courses.map((c) => (
                  <li key={c.id} className="grid grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)] items-center gap-3 border-t border-ivory-warm py-3.5 text-sm">
                    <span className="font-semibold">{c.name}</span><span className="text-muted">{c.duration}</span><span className="text-muted">{fee(c.fee, am)}</span>
                  </li>
                ))}
                {courses.length === 0 && <li className="border-t border-ivory-warm py-3.5 text-sm text-muted">{tx('Courses will be announced soon.', 'ኮርሶች በቅርቡ ይገለጻሉ።')}</li>}
              </ul>
              <div className="flex flex-wrap gap-2 text-[13px] font-semibold">
                <span className="rounded-full bg-teal-tint px-3 py-1.5 text-teal">{tx('Morning · afternoon · weekend classes', 'የጠዋት · የከሰዓት · የቅዳሜና እሁድ ክፍለ ጊዜዎች')}</span>
                <span className="rounded-full bg-[#FFF4DC] px-3 py-1.5 text-[#6B4A00]">{tx('Certificate on completion', 'ሲጨርሱ የምስክር ወረቀት')}</span>
              </div>
              <button type="button" onClick={() => startApply(dept)} className="btn btn-ink self-start">{am ? `ለ${blocks[dept].headline} ያመልክቱ` : `Apply for ${blocks[dept].headline}`}</button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}

const STEPS = {
  en: [
    ['1', 'Apply online or in person', 'Choose a department and course.'],
    ['2', 'Short interview', 'We call you to confirm your place.'],
    ['3', 'Pay registration', 'Telebirr, CBE Birr or cash.'],
    ['4', 'Start class', 'Get your timetable and materials.'],
  ],
  am: [
    ['1', 'በመስመር ላይ ወይም በአካል ያመልክቱ', 'የስልጠና ክፍል እና ኮርስ ይምረጡ።'],
    ['2', 'አጭር ቃለ መጠይቅ', 'ቦታዎን ለማረጋገጥ እንደውልልዎታለን።'],
    ['3', 'የምዝገባ ክፍያ', 'በቴሌብር፣ በሲቢኢ ብር ወይም በጥሬ ገንዘብ።'],
    ['4', 'ትምህርት ይጀምሩ', 'የጊዜ ሰሌዳዎን እና የትምህርት መሣሪያዎችን ይውሰዱ።'],
  ],
};
const TIMES = [['Morning', 'ጠዋት'], ['Afternoon', 'ከሰዓት'], ['Evening', 'ማታ'], ['Weekend', 'ቅዳሜና እሁድ']];
const EDUCATION = [['Grade 8–10', 'ከ8ኛ–10ኛ ክፍል'], ['Grade 12 complete', '12ኛ ክፍል ያጠናቀቀ'], ['TVET / diploma', 'ቴክኒክና ሙያ / ዲፕሎማ'], ['Degree', 'ዲግሪ'], ['Other', 'ሌላ']];

export function Admissions() {
  const { site, dept, setDept, courseId, setCourseId, t, tx, lang } = useSite();
  const am = lang === 'am';
  const block = useBlock('admissions');
  const blocks = { FASHION: useBlock('dept-fashion'), CULINARY: useBlock('dept-culinary'), BEAUTY: useBlock('dept-beauty') };
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState('');
  const courses = site.courses.filter((c) => c.department === dept);
  const realCourses = !site.offline;

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    const f = new FormData(e.currentTarget);
    if (!isPhone(String(f.get('phone') || ''))) return setError(tx('Please check the phone number, e.g. 0911 234 567.', 'እባክዎ ስልክ ቁጥሩን ያረጋግጡ፤ ለምሳሌ 0911 234 567።'));
    setState('sending');
    try {
      await api('/public/training-applications', {
        method: 'POST',
        body: {
          department: dept, courseId: realCourses ? courseId : '',
          name: f.get('name'), phone: f.get('phone'), preferredTime: f.get('time'), education: f.get('education'),
          age: f.get('age') || '', message: f.get('message') || '', website: f.get('website') || '',
        },
      });
      setState('sent');
    } catch (err) {
      setState('idle');
      const detail = err instanceof Error ? err.message : '';
      setError(am ? `መላክ አልተቻለም። እባክዎ መረጃውን ያረጋግጡ ወይም ይደውሉልን።${detail ? ` (${detail})` : ''}` : detail || 'Could not send. Please try again or call us.');
    }
  }

  return (
    <section id="apply" className="section bg-ivory-warm">
      <div className="wrap flex flex-wrap items-start gap-16">
        <Reveal className="flex min-w-0 flex-[1_1_360px] flex-col gap-5">
          <p className="eyebrow m-0 text-teal">{tx('Admissions', 'ምዝገባ')}</p>
          <Headline text={block.headline} />
          <ol className="mt-2">
            {STEPS[am ? 'am' : 'en'].map(([n, name, text]) => (
              <li key={n} className="flex gap-4 border-t border-[#C9D5E8] py-4">
                <span className="w-8 font-serif text-[30px] leading-none text-teal">{n}</span>
                <span><span className="block font-semibold">{name}</span><span className="text-sm text-muted">{text}</span></span>
              </li>
            ))}
          </ol>
          <p className="text-sm text-muted">{block.body}</p>
        </Reveal>

        <Reveal delay={0.1} className="min-w-0 flex-[1.3_1_520px] rounded-xl bg-white p-6 shadow-[0_24px_60px_rgba(17,24,32,.08)] md:p-10">
          <AnimatePresence mode="wait">
            {state === 'sent' ? (
              <motion.div key="ok" role="status" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-4 py-12 text-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-teal text-white"><Check className="h-7 w-7" /></span>
                <h3 className="font-serif text-[38px]">{tx('Application received.', 'ማመልከቻዎ ደርሶናል።')}</h3>
                <p className="max-w-sm leading-relaxed text-muted">{am
                  ? `ለ${blocks[dept].headline} ስላመለከቱ እናመሰግናለን። አጭር ቃለ መጠይቅ ለማዘጋጀት እንደውልልዎታለን።`
                  : `Thank you for applying to ${blocks[dept].headline}. We will call you to arrange a short interview.`}</p>
                <button type="button" onClick={() => setState('idle')} className="btn btn-line">{tx('Send another application', 'ሌላ ማመልከቻ ይላኩ')}</button>
              </motion.div>
            ) : (
              <motion.form key="f" onSubmit={submit} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative flex flex-col gap-5">
                {/* Left empty by people (it is hidden); spam bots fill it in and are ignored by the server. */}
                <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-px w-px opacity-0" />
                <fieldset className="field">
                  <legend className="mb-2">{tx('Department', 'የስልጠና ክፍል')}</legend>
                  <div className="flex flex-wrap gap-2">
                    {DEPTS.map((d) => (
                      <button key={d.id} type="button" onClick={() => { setDept(d.id); setCourseId(''); }} aria-pressed={dept === d.id}
                        className={clsx('chip', dept === d.id ? 'border-ink bg-ink text-white' : 'border-[#C9D5E8] hover:border-ink')}>{blocks[d.id].headline}</button>
                    ))}
                  </div>
                </fieldset>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="field">{tx('Full name', 'ሙሉ ስም')}<input className="input" name="name" required minLength={2} maxLength={120} autoComplete="name" /></label>
                  <label className="field">{tx('Phone', 'ስልክ')}<input className="input" name="phone" type="tel" inputMode="tel" required pattern={PHONE_PATTERN} maxLength={25} autoComplete="tel" placeholder="09…" /></label>
                  <label className="field">{tx('Course', 'ኮርስ')}
                    <select className="input" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
                      <option value="">{tx('Not sure yet', 'ገና አልወሰንኩም')}</option>
                      {courses.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.duration}</option>)}
                    </select>
                  </label>
                  <label className="field">{tx('Preferred time', 'የሚመርጡት ሰዓት')}
                    {/* The value sent stays in English, so staff see the same words in the admin. */}
                    <select className="input" name="time" defaultValue="Morning">{TIMES.map(([en, a]) => <option key={en} value={en}>{am ? a : en}</option>)}</select>
                  </label>
                  <label className="field">{tx('Education level', 'የትምህርት ደረጃ')}
                    <select className="input" name="education" defaultValue="Grade 12 complete">{EDUCATION.map(([en, a]) => <option key={en} value={en}>{am ? a : en}</option>)}</select>
                  </label>
                  <label className="field">{tx('Age', 'ዕድሜ')}<input className="input" name="age" type="number" min={10} max={90} /></label>
                </div>
                <label className="field">{tx('Why do you want to join?', 'ለምን መቀላቀል ይፈልጋሉ?')}<textarea className="input" name="message" rows={3} maxLength={2000} placeholder={tx('Tell us a little about yourself…', 'ስለራስዎ ትንሽ ይንገሩን…')} /></label>
                {error && <p role="alert" className="rounded-lg bg-[#FDE7E5] px-4 py-3 text-sm text-[#9B1C14]">{error}</p>}
                <button type="submit" disabled={state === 'sending'} className="btn btn-ink w-full">
                  {state === 'sending' ? <><Loader2 className="h-4 w-4 animate-spin" />{tx('Sending…', 'በመላክ ላይ…')}</> : t.sendApplication}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </Reveal>
      </div>
    </section>
  );
}
