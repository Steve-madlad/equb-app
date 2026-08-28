import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from 'next-themes';

const baseUrl = process.env.NEXT_PUBLIC_APP_URL;

if (!baseUrl) {
  throw new Error('Base url missing in ENV');
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#022c22' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: 'Equb (እቁብ) — Modern Rotating Savings & Credit Platform',
    template: '%s | Equb',
  },
  description:
    'Equb is a modern, trusted digital platform for Ethiopian rotating savings and credit associations (ROSCA / እቁብ). Join groups, make instant contributions via Chapa (Telebirr, CBE, BOA), and receive automated winning payouts.',
  applicationName: 'Equb',
  authors: [{ name: 'Equb Team', url: baseUrl }],
  generator: 'Next.js',
  keywords: [
    'Equb',
    'እቁብ',
    'Ethiopian savings',
    'Rotating savings',
    'ROSCA Ethiopia',
    'Chapa payment',
    'Telebirr Equb',
    'CBE Birr savings',
    'Fintech Ethiopia',
    'Community savings',
    'Digital Equb',
    'Ethiopian fintech',
    'Peer-to-peer savings',
    'Rotating credit',
  ],
  creator: 'Equb Team',
  publisher: 'Equb',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Equb (እቁብ) — Modern Rotating Savings & Credit Platform',
    description:
      'Join trusted rotating savings groups with instant Chapa payments (Telebirr, CBE Birr, M-Pesa), fair automated draws, and complete ledger transparency.',
    url: baseUrl,
    siteName: 'Equb',
    images: [
      {
        url: '/equb-app.png',
        width: 1200,
        height: 630,
        alt: 'Equb — Modern Ethiopian Rotating Savings Platform',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Equb (እቁብ) — Modern Rotating Savings & Credit Platform',
    description:
      'Trusted Ethiopian rotating savings platform with automated Chapa payouts & Telebirr/CBE payments.',
    images: ['/equb-app.png'],
    creator: '@equb_app',
  },
  icons: {
    icon: '/equb-app.png',
    shortcut: '/equb-app.png',
    apple: '/equb-app.png',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebApplication',
      '@id': `${baseUrl}/#webapp`,
      name: 'Equb',
      url: baseUrl,
      applicationCategory: 'FinanceApplication',
      operatingSystem: 'All',
      description:
        'A modern, trusted digital platform for Ethiopian Equb (እቁብ) rotating savings and credit associations.',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'ETB',
      },
      featureList: [
        'Instant Chapa contributions via Telebirr, CBE Birr, and M-Pesa',
        'Automated fair round draws',
        'Complete transparent ledger tracking',
        'Automated winner bank disbursements',
      ],
      screenshot: `${baseUrl}/equb-app.png`,
    },
    {
      '@type': 'Organization',
      '@id': `${baseUrl}/#organization`,
      name: 'Equb',
      url: baseUrl,
      logo: `${baseUrl}/equb-app.png`,
      sameAs: [],
    },
    {
      '@type': 'WebSite',
      '@id': `${baseUrl}/#website`,
      url: baseUrl,
      name: 'Equb',
      publisher: {
        '@id': `${baseUrl}/#organization`,
      },
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
