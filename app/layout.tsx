import type { Metadata } from 'next';
import { Sora, IBM_Plex_Mono, Inter } from 'next/font/google';
import './globals.css';

const display = Sora({ subsets: ['latin'], variable: '--font-display', weight: ['600', '700'] });
const body = Inter({ subsets: ['latin'], variable: '--font-body' });
const mono = IBM_Plex_Mono({ subsets: ['latin'], variable: '--font-mono', weight: ['400', '500'] });

export const metadata: Metadata = {
  title: 'CRM Lead Importer — GrowEasy',
  description: 'Upload any CSV export and map it into GrowEasy CRM format automatically.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body className="bg-bg text-ink font-body antialiased">{children}</body>
    </html>
  );
}
