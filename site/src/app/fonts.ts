import localFont from 'next/font/local';
import { Geist_Mono } from 'next/font/google';

// General Sans (Fontshare) para texto e títulos; Geist Mono para datas, contadores e siglas.
export const sans = localFont({
  src: [
    { path: '../fonts/general-sans-400-normal.woff2', weight: '400', style: 'normal' },
    { path: '../fonts/general-sans-500-normal.woff2', weight: '500', style: 'normal' },
    { path: '../fonts/general-sans-600-normal.woff2', weight: '600', style: 'normal' },
    { path: '../fonts/general-sans-700-normal.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-sans',
  display: 'swap',
});

export const mono = Geist_Mono({ subsets: ['latin', 'latin-ext'], weight: ['400', '500'], variable: '--font-mono', display: 'swap' });
