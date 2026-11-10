/** Brand icons (simple strokes, matching lucide's style). */
type P = { className?: string };
const base = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };

export const InstagramIcon = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r=".8" fill="currentColor" /></svg>
);
export const TikTokIcon = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}><path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5" /><path d="M14 3c.5 2.6 2.4 4.4 5 4.6" /></svg>
);
export const FacebookIcon = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}><path d="M15 3h-2a4 4 0 0 0-4 4v3H7v4h2v7h4v-7h2.5l.5-4h-3V7.5a1 1 0 0 1 1-1h2z" /></svg>
);
export const TelegramIcon = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}><path d="M22 2 11 13" /><path d="M22 2 15 22l-4-9-9-4 20-7z" /></svg>
);
export const YouTubeIcon = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}><rect x="2" y="5" width="20" height="14" rx="4" /><path d="m10 9 5 3-5 3z" fill="currentColor" /></svg>
);
