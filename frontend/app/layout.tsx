import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Header from '@/components/layout/Header'
import { AuthProvider } from '@/contexts/AuthContext'
import { CartProvider } from '@/contexts/CartContext'
import { Toaster } from 'react-hot-toast'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ShopSwift - Premium Electronics in South Africa',
  description: 'Shop the latest electronics, appliances, and gadgets with fast delivery across South Africa',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/*
          AuthProvider must be OUTSIDE CartProvider.
          CartContext calls useAuth() internally — if AuthProvider
          isn't the outer wrapper it throws:
          "useAuth() must be called inside AuthProvider"
        */}
        <AuthProvider>
          <CartProvider>
            <Header />
            {children}
            <Toaster position="bottom-right" />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  )
}