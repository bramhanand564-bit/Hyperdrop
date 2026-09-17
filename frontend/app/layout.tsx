import './globals.css';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'HyperDrop — Private P2P File Transfer',
  description: 'Fast, private peer-to-peer file sharing between devices.',
  applicationName: 'HyperDrop',
  keywords: ['file transfer', 'P2P', 'WebRTC', 'file sharing', 'HyperDrop'],
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#020617',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
