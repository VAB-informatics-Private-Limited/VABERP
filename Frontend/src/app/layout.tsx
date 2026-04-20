import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { BrandingProvider } from '@/providers/BrandingProvider';
import { QueryProvider } from '@/providers/QueryProvider';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: 'VAB Enterprise',
  description: 'Enterprise Resource Planning & Business Management System',
  icons: {
    icon: [{ url: '/favicon.png', type: 'image/png' }],
    apple: '/favicon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AntdRegistry>
          <BrandingProvider>
            <QueryProvider>{children}</QueryProvider>
          </BrandingProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
