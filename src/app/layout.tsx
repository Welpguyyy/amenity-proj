//import './index.module.css'; // optional global CSS
import './globals.css';
import SessionWrapper from './SessionWrapper';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Amenity',
  description: 'Bible Website Project',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body>
        <SessionWrapper>
          {children}
        </SessionWrapper>
      </body>
    </html>
  );
}
