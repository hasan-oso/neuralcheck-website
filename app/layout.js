import './globals.css';
import { LanguageProvider } from '@/lib/LanguageContext';
import { AuthProvider } from '@/lib/AuthContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const SITE_URL = 'https://neuralcheck.net';
const SITE_NAME = 'NeuralCheck';
const TITLE = 'NeuralCheck — AI-powered phone diagnostics';
const DESCRIPTION =
  'Check any smartphone before you buy. AI-powered diagnostic with 100+ tests in 8 minutes. Verifiable QR-coded reports. Validated on flagship and mid-range Androids.';

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: '%s — NeuralCheck',
  },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    'NeuralCheck',
    'phone diagnostic',
    'smartphone test',
    'AI scan',
    'used phone check',
    'mobile health',
    'Android diagnostic',
    'فحص هاتف',
    'فحص جوال',
    'تقرير هاتف',
    'telefon kontrolü',
    'akıllı telefon test',
  ],
  authors: [{ name: 'NeuralCheck' }],
  creator: 'NeuralCheck',
  publisher: 'NeuralCheck',
  alternates: {
    canonical: SITE_URL,
    languages: {
      en: `${SITE_URL}/`,
      ar: `${SITE_URL}/`,
      tr: `${SITE_URL}/`,
    },
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_NAME,
    type: 'website',
    locale: 'ar_SA',
    alternateLocale: ['en_US', 'tr_TR'],
    images: [
      {
        url: '/logo.svg',
        width: 512,
        height: 512,
        alt: 'NeuralCheck logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/logo.svg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/logo.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: '32x32' },
    ],
    shortcut: '/logo.svg',
    apple: [{ url: '/logo.svg', type: 'image/svg+xml' }],
  },
  manifest: '/manifest.webmanifest',
};

export const viewport = {
  themeColor: '#0A0E1A',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body
        className="bg-nc-bg text-nc-text1 min-h-screen flex flex-col antialiased"
        suppressHydrationWarning
      >
        <LanguageProvider>
          <AuthProvider>
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
