import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'
import { Toaster } from 'sonner'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AfriStar Pay V2 - Cross-Border Remittance on Stellar',
  description: 'Zero-knowledge privacy-preserving cross-border payments powered by Stellar Soroban smart contracts',
  keywords: ['stellar', 'soroban', 'remittance', 'cross-border', 'payments', 'africa', 'blockchain', 'defi'],
  authors: [{ name: 'AfriStar Pay Team' }],
  creator: 'AfriStar Pay',
  publisher: 'AfriStar Pay',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://afristarpay.com',
    siteName: 'AfriStar Pay',
    title: 'AfriStar Pay V2 - Cross-Border Remittance on Stellar',
    description: 'Zero-knowledge privacy-preserving cross-border payments powered by Stellar Soroban smart contracts',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'AfriStar Pay - Cross-Border Remittance',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AfriStar Pay V2 - Cross-Border Remittance on Stellar',
    description: 'Zero-knowledge privacy-preserving cross-border payments powered by Stellar Soroban smart contracts',
    images: ['/twitter-image.png'],
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
  themeColor: '#0ea5e9',
  manifest: '/site.webmanifest',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
        <Providers>
          {children}
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: 'rgb(255, 255, 255)',
                color: 'rgb(15, 23, 42)',
                border: '1px solid rgb(226, 232, 240)',
              },
            }}
          />
        </Providers>
      </body>
    </html>
  )
}