'use client'

import { useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSettingsStore, LogEntry } from '@/store/settingsStore'

function formatTime(ts: number): string {
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function levelColor(level: LogEntry['level']): string {
  if (level === 'error') return '#f87171'
  if (level === 'warn') return '#f59e0b'
  return '#8888aa'
}

function levelBadge(level: LogEntry['level']): string {
  if (level === 'error') return 'ERROR'
  if (level === 'warn') return 'WARN '
  return 'INFO '
}

export default function LogPanel() {
  const { logs, clearLogs, isLogOpen, setIsLogOpen } = useSettingsStore()

  const handleDownload = useCallback(() => {
    const lines = logs
      .map((l) => `[${new Date(l.timestamp).toISOString()}] [${l.level.toUpperCase()}] ${l.message}`)
      .join('\n')
    const blob = new Blob([lines], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ai-life-logs-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }, [logs])

  if (!isLogOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.7)' }}
        onClick={(e) => { if (e.target === e.currentTarget) setIsLogOpen(false) }}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-2xl flex flex-col card"
          style={{ background: 'var(--bg-card)', height: '70vh' }}
        >
          {/* 标题栏 */}
          <div className="flex items-center justify-between mb-3 shrink-0">
            <h2 className="text-lg font-bold text-[#e0e0f0]">📋 运行日志</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownload}
                disabled={logs.length === 0}
                className="btn-ghost btn-sm text-xs"
                style={{ padding: '4px 10px' }}
              >
                ⬇ 下载日志
              </button>
              <button
                onClick={clearLogs}
                disabled={logs.length === 0}
                className="btn-ghost btn-sm text-xs"
                style={{ padding: '4px 10px', color: '#f87171', borderColor: 'rgba(248,113,113,0.3)' }}
              >
                🗑 清空
              </button>
              <button
                onClick={() => setIsLogOpen(false)}
                className="text-[#666688] hover:text-[#e0e0f0] transition-colors text-xl leading-none ml-1"
              >
                ✕
              </button>
            </div>
          </div>

          {/* 日志列表 */}
          <div
            className="flex-1 overflow-y-auto font-mono text-xs rounded-lg p-3 space-y-1"
            style={{ background: 'var(--bg-surface)' }}
          >
            {logs.length === 0 ? (
              <p className="text-[#555577] text-center mt-8">暂无日志</p>
            ) : (
              [...logs].reverse().map((entry) => (
                <div key={entry.id} className="flex gap-2 leading-relaxed">
                  <span className="text-[#555577] shrink-0">{formatTime(entry.timestamp)}</span>
                  <span className="shrink-0" style={{ color: levelColor(entry.level) }}>
                    [{levelBadge(entry.level)}]
                  </span>
                  <span className="break-all" style={{ color: entry.level === 'error' ? '#f87171' : 'var(--text-body)' }}>
                    {entry.message}
                  </span>
                </div>
              ))
            )}
          </div>

          <p className="text-xs text-[#555577] mt-2 shrink-0">
            共 {logs.length} 条日志（最多保留 500 条）
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
