import type { Metadata } from 'next';
import './globals.css';
import CookieBanner from '@/components/CookieBanner';
import { BASE_URL } from '@/lib/base-url';

const APP_URL = BASE_URL;
const TITLE = 'RideDrop — Train-powered delivery across the UK';
const DESCRIPTION =
  "RideDrop connects people who need to send packages between UK cities with travellers already making that train journey. Faster than Royal Mail. Cheaper than couriers.";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: TITLE,
    template: '%s · RideDrop',
  },
  description: DESCRIPTION,
  keywords: [
    'parcel delivery UK',
    'train delivery',
    'peer-to-peer courier',
    'London Manchester delivery',
    'same-day delivery UK',
    'ridedrop',
  ],
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: APP_URL,
    siteName: 'RideDrop',
    locale: 'en_GB',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'RideDrop',
              url: APP_URL,
              description: DESCRIPTION,
              areaServed: 'GB',
            }),
          }}
        />
      </head>
      <body>
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}
