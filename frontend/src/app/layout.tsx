import type { Metadata, Viewport } from 'next';
import { Cormorant_Garamond, Inter, Noto_Sans_Ethiopic, Noto_Serif_Ethiopic, Space_Grotesk } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import './globals.css';

const serif = Cormorant_Garamond({ subsets: ['latin'], weight: ['500', '600'], style: ['normal', 'italic'], variable: '--font-serif', display: 'swap' });
const sans = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const display = Space_Grotesk({ subsets: ['latin'], weight: ['500', '700'], variable: '--font-display', display: 'swap' });
const ethiopic = Noto_Serif_Ethiopic({ subsets: ['ethiopic'], weight: ['500'], variable: '--font-ethiopic', display: 'swap' });
// Amharic letters in body text and buttons (Inter and the display font have no Ethiopic letters).
const ethiopicSans = Noto_Sans_Ethiopic({ subsets: ['ethiopic'], weight: ['400', '600'], variable: '--font-ethiopic-sans', display: 'swap', preload: false });

const ON_VERCEL = Boolean(process.env.VERCEL);

export const metadata: Metadata = {
  title: { default: 'DaMarios Garment and Skill Training Center', template: '%s · DaMarios' },
  description: 'DaMarios in Wolaita Sodo, Ethiopia: garment and spice production for local and international markets, and skill training in fashion design, culinary arts and beautification.',
  openGraph: { title: 'DaMarios Garment and Skill Training Center', description: 'Heritage we weave. Skills we pass on.', type: 'website' },
};

export const viewport: Viewport = { themeColor: '#0B1F3F', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable} ${display.variable} ${ethiopic.variable} ${ethiopicSans.variable}`}>
      <body>
        {children}
        {/* Vercel visitor counts and real-visitor speed: only for the preview hosted on Vercel. */}
        {ON_VERCEL && <Analytics />}
        {ON_VERCEL && <SpeedInsights />}
      </body>
    </html>
  );
}
