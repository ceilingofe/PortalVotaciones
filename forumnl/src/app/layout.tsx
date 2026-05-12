import './globals.css';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'FórumNL — IEEPCNL Participa',
  description:
    'Plataforma de participación ciudadana del Instituto Estatal Electoral y de Participación Ciudadana de Nuevo León.',
  applicationName: 'FórumNL',
  icons: { icon: '/logo-ieepc.png' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#F5C518',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-MX">
      <body>{children}</body>
    </html>
  );
}
