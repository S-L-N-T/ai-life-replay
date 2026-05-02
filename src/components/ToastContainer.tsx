'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useSettingsStore, ToastItem } from '@/store/settingsStore'

function toastStyle(type: ToastItem['type']): { bg: string; border: string; icon: string } {
  if (type === 'error') return { bg: 'rgba(248,71,71,0.15)', border: 'rgba(248,113,113,0.4)', icon: '✖' }
  if (type === 'success') return { bg: 'rgba(74,222,128,0.12)', border: 'rgba(74,222,128,0.4)', icon: '✔' }
  return { bg: 'rgba(96,165,250,0.12)', border: 'rgba(96,165,250,0.4)', icon: 'ℹ' }
}

export default function ToastContainer() {
  const { toasts, dismissToast } = useSettingsStore()

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none max-w-sm w-full">
      <AnimatePresence>
        {toasts.map((toast) => {
          const style = toastStyle(toast.type)
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 40, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.9 }}
              transition={{ duration: 0.25 }}
              className="pointer-events-auto flex items-start gap-3 rounded-xl px-4 py-3 text-sm shadow-lg"
              style={{
                background: style.bg,
                border: `1px solid ${style.border}`,
                color: 'var(--text-body)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <span className="shrink-0 font-bold" style={{ color: style.border }}>
                {style.icon}
              </span>
              <span className="flex-1 break-words">{toast.message}</span>
              <button
                onClick={() => dismissToast(toast.id)}
                className="shrink-0 text-[#666688] hover:text-[#e0e0f0] transition-colors leading-none mt-0.5"
              >
                ✕
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
