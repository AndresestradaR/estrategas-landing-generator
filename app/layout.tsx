import type { Metadata } from 'next'
import { Toaster } from 'react-hot-toast'
import './globals.css'

export const metadata: Metadata = {
  title: 'Estrategas IA - Generador de Landings',
  description: 'Genera imágenes de producto profesionales con IA para tus landings de dropshipping',
  keywords: ['landing page', 'dropshipping', 'AI', 'product images', 'e-commerce'],
  authors: [{ name: 'Estrategas IA' }],
  openGraph: {
    title: 'Estrategas IA - Generador de Landings',
    description: 'Genera imágenes de producto profesionales con IA',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-background text-text-primary antialiased">
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#141419',
              color: '#FFFFFF',
              border: '1px solid #2A2A35',
            },
            success: {
              iconTheme: {
                primary: '#BFFF00',
                secondary: '#0A0A0F',
              },
            },
            error: {
              iconTheme: {
                primary: '#FF4D4D',
                secondary: '#0A0A0F',
              },
            },
          }}
        />
      </body>
    </html>
  )
}