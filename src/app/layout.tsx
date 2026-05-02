import type { Metadata } from 'next'
import { Noto_Sans_SC, Noto_Serif_SC } from 'next/font/google'
import './globals.css'
import ToastContainer from '@/components/ToastContainer'
import SettingsModal from '@/components/SettingsModal'
import LogPanel from '@/components/LogPanel'
import GlobalToolbar from '@/components/GlobalToolbar'

const notoSans = Noto_Sans_SC({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '900'],
  variable: '--font-noto-sans',
  display: 'swap',
})

const notoSerif = Noto_Serif_SC({
  subsets: ['latin'],
  weight: ['400', '600', '700', '900'],
  variable: '--font-noto-serif',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'AI 人生重开手帐',
  description: 'AI 驱动的文字人生模拟游戏 - 选择你的世界，创造属于你的故事',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN" className={`${notoSans.variable} ${notoSerif.variable}`}>
      <body className="min-h-screen">
        <GlobalToolbar />
        <SettingsModal />
        <LogPanel />
        <ToastContainer />
        {children}
      </body>
    </html>
  )
}
