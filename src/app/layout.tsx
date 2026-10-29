import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Bela — AI Voice Agents',
  description: 'AI voice agents that answer, book and qualify calls for your business, 24/7.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
