import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'مولد الصور الحائطية | Wall Art Generator',
  description: 'توليد حزمة صور حائطية احترافية لمحلك التجاري',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  )
}
