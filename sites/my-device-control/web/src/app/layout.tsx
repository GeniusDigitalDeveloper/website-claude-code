import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { AuthProvider } from '@/lib/auth';
import { ToastProvider } from '@/components/ui';

export const metadata: Metadata = { title: 'MY DEVICE CONTROL', description: 'Pengurusan peranti berpusat untuk tablet Android dan laptop Windows.' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ms">
      <body><ToastProvider><AuthProvider>{children}</AuthProvider></ToastProvider></body>
    </html>
  );
}
