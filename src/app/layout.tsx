import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MousePRO — Advanced Cursor Studio',
  description: 'Professional cursor customization. Upload images, process them into pixel-perfect cursors, and export for macOS, Windows, Linux, and the web.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-[#060610] text-slate-200 antialiased">
        {children}
      </body>
    </html>
  );
}
