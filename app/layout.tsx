import type { Metadata } from 'next';
import './globals.css';
import Providers from '@/app/components/providers';
import SplashScreen from '@/app/components/splash';

/* Global root metadata for AttendSync */
export const metadata: Metadata = {
  title: 'AttendSync | Swinburne Sarawak Attendance System',
  description:
    'AttendSync is a browser-based attendance system prototype for Swinburne Sarawak, designed for secure sign-in, QR-based check-in, and real-time attendance workflows.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased">
        <Providers>
          <SplashScreen />
          {children}
        </Providers>
      </body>
    </html>
  );
}