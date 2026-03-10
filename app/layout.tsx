import type { Metadata } from 'next';
import './globals.css';
import Providers from '@/app/components/providers';

export const metadata: Metadata = {
  title: 'Attendance System - Swinburne Sarawak',
  description: 'Automated Attendance Taking System',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}