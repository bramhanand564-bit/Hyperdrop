import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'HyperDrop - Fast P2P Transfer',
  description: 'Private, secure, and fast peer-to-peer file transfer.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
