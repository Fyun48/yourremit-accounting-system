import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '外匯會計系統',
  description: '專業的外匯匯兌會計財務管理系統',
  icons: {
    icon: '/LOGO_ICON.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-TW">
      <body>{children}</body>
    </html>
  )
}
