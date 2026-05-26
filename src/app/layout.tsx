import type { Metadata, Viewport } from 'next'
import { Syne, DM_Sans, DM_Mono } from 'next/font/google'
import { SessionProvider } from '@/components/providers/SessionProvider'
import { ToastProvider } from '@/components/providers/ToastProvider'
import './globals.css'

const dmSans = DM_Sans({ subsets:['latin'], variable:'--font-sans', weight:['300','400','500','600','700'] })
const syne   = Syne({ subsets:['latin'], variable:'--font-display', weight:['600','700','800'] })
const dmMono = DM_Mono({ subsets:['latin'], variable:'--font-mono', weight:['400','500'] })

export const metadata: Metadata = {
  title:       'TransfertPro',
  description: 'Gestion journalière de trésorerie — Transfert d\'argent',
  manifest:    '/api/manifest',
  appleWebApp: { capable:true, statusBarStyle:'black-translucent', title:'TransfertPro' },
}
export const viewport: Viewport = {
  themeColor:'#0B2D8F', width:'device-width', initialScale:1, maximumScale:1,
  userScalable:false, viewportFit:'cover',
}

export default function RootLayout({ children }: { children:React.ReactNode }) {
  return (
    <html lang="fr" className={`${dmSans.variable} ${syne.variable} ${dmMono.variable}`}>
      <body>
        <SessionProvider>
          {children}
          <ToastProvider/>
        </SessionProvider>
      </body>
    </html>
  )
}