import type { Metadata } from 'next'
import './globals.css'
import SessionProvider from '@/components/SessionProvider'
import Navigation from '@/components/Navigation'
import { ToastProvider } from '@/components/ToastProvider'

export const metadata: Metadata = {
  title: 'TripTok - Plan Your Trips',
  description: 'Transform your saved travel videos into structured itineraries',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-gray-50">
        <SessionProvider>
          <ToastProvider>
            <Navigation />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {children}
            </main>
          </ToastProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
