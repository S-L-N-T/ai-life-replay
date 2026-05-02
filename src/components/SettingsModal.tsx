'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSettingsStore, ApiSettings } from '@/store/settingsStore'

// ModalContent mounts fresh every time the modal opens, so useState(apiSettings)
// always picks up the latest stored settings without needing a useEffect sync.
function ModalContent({ initialSettings, onClose }: {
  initialSettings: ApiSettings
  onClose: () => void
}) {
  const { setApiSettings, showToast, addLog } = useSettingsStore()

  const [localSettings, setLocalSettings] = useState<ApiSettings>(initialSettings)
  const [models, setModels] = useState<string[]>([])
  const [isFetchingModels, setIsFetchingModels] = useState(false)

  const handleSave = () => {
    setApiSettings(localSettings)
    showToast('success', '设置已保存')
    addLog('info', `API 设置已更新: baseURL=${localSettings.baseURL || '默认'}, model=${localSettings.model || '默认'}`)
    onClose()
  }

  const handleFetchModels = async () => {
    setIsFetchingModels(true)
    setModels([])
    addLog('info', `正在获取模型列表: baseURL=${localSettings.baseURL || '默认'}`)
    try {
      const response = await fetch('/api/game/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseURL: localSettings.baseURL || undefined,
          apiKey: localSettings.apiKey || undefined,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        const msg = data.error || '获取模型列表失败'
        showToast('error', msg)
        addLog('error', msg)
      } else {
        setModels(data.models || [])
        addLog('info', `获取到 ${(data.models || []).length} 个模型`)
        if ((data.models || []).length === 0) {
          showToast('info', '未获取到模型，请检查 API 设置')
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '请求失败'
      showToast('error', msg)
      addLog('error', `获取模型列表失败: ${msg}`)
    } finally {
      setIsFetchingModels(false)
    }
  }

  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.95, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="w-full max-w-lg card"
      style={{ background: 'var(--bg-card)', maxHeight: '90vh', overflowY: 'auto' }}
    >
      {/* 标题 */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-[#e0e0f0]">⚙ API 设置</h2>
        <button
          onClick={onClose}
          className="text-[#666688] hover:text-[#e0e0f0] transition-colors text-xl leading-none"
        >
          ✕
        </button>
      </div>

      <p className="text-xs text-[#8888aa] mb-4">
        留空则使用服务端默认 API 配置。自定义设置仅存储在本地浏览器中。
      </p>

      {/* Base URL */}
      <div className="mb-4">
        <label className="block text-sm text-[#a78bfa] mb-1">Base URL</label>
        <input
          type="url"
          value={localSettings.baseURL}
          onChange={(e) => setLocalSettings((s) => ({ ...s, baseURL: e.target.value }))}
          placeholder="例如: https://api.openai.com/v1"
          className="w-full px-3 py-2 rounded-lg text-sm outline-none focus:ring-1"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            color: 'var(--text-body)',
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--primary)')}
          onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
        />
      </div>

      {/* API Key */}
      <div className="mb-4">
        <label className="block text-sm text-[#a78bfa] mb-1">API Key</label>
        <input
          type="password"
          value={localSettings.apiKey}
          onChange={(e) => setLocalSettings((s) => ({ ...s, apiKey: e.target.value }))}
          placeholder="sk-..."
          className="w-full px-3 py-2 rounded-lg text-sm outline-none"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            color: 'var(--text-body)',
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--primary)')}
          onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
        />
      </div>

      {/* 模型选择 */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <label className="text-sm text-[#a78bfa]">模型</label>
          <button
            onClick={handleFetchModels}
            disabled={isFetchingModels}
            className="btn-ghost btn-sm text-xs"
            style={{ padding: '4px 10px' }}
          >
            {isFetchingModels ? '获取中…' : '🔄 获取可用模型'}
          </button>
        </div>

        {models.length > 0 ? (
          <select
            value={localSettings.model}
            onChange={(e) => setLocalSettings((s) => ({ ...s, model: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              color: 'var(--text-body)',
            }}
          >
            <option value="">— 默认模型 —</option>
            {models.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            value={localSettings.model}
            onChange={(e) => setLocalSettings((s) => ({ ...s, model: e.target.value }))}
            placeholder="例如: gpt-4o-mini（留空使用默认）"
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              color: 'var(--text-body)',
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--primary)')}
            onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
          />
        )}
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-3 mt-6">
        <button onClick={onClose} className="btn-ghost flex-1">
          取消
        </button>
        <button onClick={handleSave} className="btn-primary flex-1">
          保存设置
        </button>
      </div>
    </motion.div>
  )
}

export default function SettingsModal() {
  const apiSettings = useSettingsStore((s) => s.apiSettings)
  const isSettingsOpen = useSettingsStore((s) => s.isSettingsOpen)
  const setIsSettingsOpen = useSettingsStore((s) => s.setIsSettingsOpen)

  if (!isSettingsOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.7)' }}
        onClick={(e) => { if (e.target === e.currentTarget) setIsSettingsOpen(false) }}
      >
        <ModalContent
          initialSettings={apiSettings}
          onClose={() => setIsSettingsOpen(false)}
        />
      </motion.div>
    </AnimatePresence>
  )
}
