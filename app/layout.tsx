import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import AppHeader from '@/components/AppHeader'

export const metadata: Metadata = {
  metadataBase: new URL('https://dealwise.us'),
  title: {
    default: 'DealWise – Out-the-Door Price & Car Negotiation Prep',
    template: '%s | DealWise',
  },
  description: 'Estimate out-the-door pricing, spot hidden dealer fees, and prepare for negotiation—built especially for first-time car buyers.',
  alternates: {
    canonical: 'https://dealwise.us',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://dealwise.us',
    siteName: 'DealWise',
    title: 'DealWise – Out-the-Door Price & Car Negotiation Prep',
    description: 'Estimate out-the-door pricing, spot hidden dealer fees, and prepare for negotiation—built especially for first-time car buyers.',
    images: [
      {
        url: '/brand/dealwise-logo.svg',
        width: 560,
        height: 140,
        alt: 'DealWise Logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DealWise – Out-the-Door Price & Car Negotiation Prep',
    description: 'Estimate out-the-door pricing, spot hidden dealer fees, and prepare for negotiation—built especially for first-time car buyers.',
    images: ['/brand/dealwise-logo.svg'],
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <AppHeader />
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}

