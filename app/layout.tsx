import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Quoridor Arena',
  description: 'Think Ahead. Block Smart. Reach the Goal.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
