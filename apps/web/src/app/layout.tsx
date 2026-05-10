import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NoteNest',
  description: 'Notes synced through MEGA cloud storage'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
