'use client';

import { createContext, useContext } from 'react';
import type { Labels } from '@/lib/i18n';
import type { Lang, SiteData, TrainingDept } from '@/lib/types';

export interface SiteCtx {
  site: SiteData;
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Labels;
  /** Department chosen in the Training section; the application form follows it. */
  dept: TrainingDept;
  setDept: (d: TrainingDept) => void;
  /** Picks a department (and course) and scrolls to the application form. */
  startApply: (d: TrainingDept, courseId?: string) => void;
  courseId: string;
  setCourseId: (id: string) => void;
  /** Picks a product in the enquiry form and scrolls to it. */
  startEnquiry: (product: 'Garments' | 'Spices' | 'Both') => void;
  enquiryProduct: 'Garments' | 'Spices' | 'Both';
  setEnquiryProduct: (p: 'Garments' | 'Spices' | 'Both') => void;
}

export const SiteContext = createContext<SiteCtx | null>(null);

export function useSite() {
  const ctx = useContext(SiteContext);
  if (!ctx) throw new Error('useSite must be used inside the public site');
  return ctx;
}

/** Section text from the admin, with a fallback. */
export function useBlock(section: string) {
  const { site } = useSite();
  return site.content[section] ?? { section, headline: '', body: '', visible: true };
}
