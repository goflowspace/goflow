import React from 'react';

import type {Metadata} from 'next';
import {Geist, Geist_Mono} from 'next/font/google';

import {Theme} from '@radix-ui/themes';

// Клиентский компонент для обработки контекстного меню
import ClientLayout from './ClientLayout';

import '@radix-ui/themes/styles.css';

import '@styles/globals.scss';

import '@styles/animations.css';
// Импортируем стили темы для модальных окон и компонентов Dashboard
import '@styles/dashboard-theme.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin']
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin']
});

export const metadata: Metadata = {
  title: 'Go Flow – Effortless Storytelling, Limitless Possibilities',
  description: 'Create and explore interactive nonlinear storytelling like never before',
  openGraph: {
    title: 'The Future of Interactive Storytelling',
    description: 'Create and explore interactive nonlinear storytelling like never before.',
    images: ['/preview.png'],
    url: 'https://goflow.space'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Go Flow – Effortless Storytelling, Limitless Possibilities',
    description: 'Create and explore interactive nonlinear storytelling like never before.',
    images: ['/preview.png']
  }
};

const RootLayout: React.FC<{children: React.ReactNode}> = ({children}) => {
  return (
    <html lang='en'>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Theme>
          <ClientLayout>{children}</ClientLayout>
        </Theme>
      </body>
    </html>
  );
};

export default RootLayout;
