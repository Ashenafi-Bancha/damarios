import type { Metadata, Viewport } from 'next';
import { Cormorant_Garamond, Inter, Noto_Serif_Ethiopic, Space_Grotesk } from 'next/font/google';
import './globals.css';

const serif = Cormorant_Garamond({ subsets: ['latin'], weight: ['500', '600'], style: ['normal', 'italic'], variable: '--font-serif', display: 'swap' });
const sans = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const display = Space_Grotesk({ subsets: ['latin'], weight: ['500', '700'], variable: '--font-display', display: 'swap' });
const ethiopic = Noto_Serif_Ethiopic({ subsets: ['ethiopic'], weight: ['500'], variable: '--font-ethiopic', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'DaMarios Garment and Skill Training Center', template: '%s · DaMarios' },
  description: 'DaMarios in Wolaita Sodo, Ethiopia: garment and spice production for local and international markets, and skill training in fashion design, culinary arts and beautification.',
  openGraph: { title: 'DaMarios Garment and Skill Training Center', description: 'Heritage we weave. Skills we pass on.', type: 'website' },
};

export const viewport: Viewport = { themeColor: '#0B1F3F', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable} ${display.variable} ${ethiopic.variable}`}>
      <body>{children}</body>
    </html>
  );
}
