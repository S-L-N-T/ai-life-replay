'use client'

import { useSettingsStore } from '@/store/settingsStore'

export default function GlobalToolbar() {
  const setIsSettingsOpen = useSettingsStore((s) => s.setIsSettingsOpen)
  const setIsLogOpen = useSettingsStore((s) => s.setIsLogOpen)
  const apiSettings = useSettingsStore((s) => s.apiSettings)
  const logs = useSettingsStore((s) => s.logs)

  const hasCustomSettings = !!(
    apiSettings.baseURL.trim() ||
    apiSettings.apiKey.trim() ||
    apiSettings.model.trim()
  )
  const errorCount = logs.filter((l) => l.level === 'error').length

  return (
    <div
      className="fixed top-3 right-3 z-40 flex items-center gap-1"
    >
      {/* 日志按钮 */}
      <button
        onClick={() => setIsLogOpen(true)}
        title="查看运行日志"
        className="relative flex items-center justify-center w-8 h-8 rounded-lg text-sm transition-all"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          color: 'var(--text-muted)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--border-accent)'
          e.currentTarget.style.color = 'var(--text-accent)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--border)'
          e.currentTarget.style.color = 'var(--text-muted)'
        }}
      >
        📋
        {errorCount > 0 && (
          <span
            className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center"
            style={{ background: '#f87171', color: 'white' }}
          >
            {errorCount > 9 ? '9+' : errorCount}
          </span>
        )}
      </button>

      {/* 设置按钮 */}
      <button
        onClick={() => setIsSettingsOpen(true)}
        title="API 设置"
        className="relative flex items-center justify-center w-8 h-8 rounded-lg text-sm transition-all"
        style={{
          background: 'var(--bg-card)',
          border: `1px solid ${hasCustomSettings ? 'var(--primary)' : 'var(--border)'}`,
          color: hasCustomSettings ? 'var(--text-accent)' : 'var(--text-muted)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--primary)'
          e.currentTarget.style.color = 'var(--text-accent)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = hasCustomSettings ? 'var(--primary)' : 'var(--border)'
          e.currentTarget.style.color = hasCustomSettings ? 'var(--text-accent)' : 'var(--text-muted)'
        }}
      >
        ⚙
        {hasCustomSettings && (
          <span
            className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full"
            style={{ background: 'var(--primary)' }}
          />
        )}
      </button>
    </div>
  )
}
