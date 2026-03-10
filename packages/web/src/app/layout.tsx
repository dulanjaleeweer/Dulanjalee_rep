import React from 'react';
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ABC EarlySteps',
  description: 'Education support for autistic children under five',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          backgroundColor: '#f7fafc',
          color: '#1a202c',
          lineHeight: 1.5,
        }}
      >
        {children}
      </body>
    </html>
  );
}
