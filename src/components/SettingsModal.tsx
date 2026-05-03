'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSettingsStore, ApiSettings } from '@/store/settingsStore'

type ApiPreset = {
  id: string
  label: string
  baseURL: string
  apiKey: string
  model?: string
  builtIn?: boolean
}

const BUILTIN_PRESET_CONFIGS: ApiPreset[] = [
  {
    id: 'siliconflow',
    label: 'SiliconFlow (DeepSeek 等)',
    baseURL: 'https://api.siliconflow.cn/v1',
    apiKey: 'sk-stkzqoziepjqqqlivcaggdocncldfmmsygjbotcconqfdcpx',
    model: '',
    builtIn: true,
  },
  {
    id: 'ggchan',
    label: 'GGChan (Gemini 等)',
    baseURL: 'https://gcli.ggchan.dev/v1',
    apiKey: 'gg-gcli-NfB634V9v8LmWd7I1pa9XXik0sNdnqSCg6tSwBDnYBI',
    model: '',
    builtIn: true,
  },
]

const CUSTOM_PRESETS_KEY = 'ai-life-replay-custom-presets'
const SELECTED_PRESET_KEY = 'ai-life-replay-preset'

function loadCustomPresets(): ApiPreset[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(CUSTOM_PRESETS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((p: any) => ({
        id: String(p.id || ''),
        label: String(p.label || ''),
        baseURL: String(p.baseURL || ''),
        apiKey: String(p.apiKey || ''),
        model: String(p.model || ''),
        builtIn: false,
      }))
      .filter((p: ApiPreset) => p.id && p.label)
  } catch {
    return []
  }
}

function persistCustomPresets(presets: ApiPreset[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(presets))
}

function resolvePresetId(customPresets: ApiPreset[]): string {
  if (typeof window === 'undefined') return BUILTIN_PRESET_CONFIGS[0].id
  const saved = localStorage.getItem(SELECTED_PRESET_KEY) || BUILTIN_PRESET_CONFIGS[0].id
  const all = [...BUILTIN_PRESET_CONFIGS, ...customPresets]
  return all.some((c) => c.id === saved) ? saved : BUILTIN_PRESET_CONFIGS[0].id
}

function makePresetId(name: string) {
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
  return `custom-${slug || Date.now().toString(36)}`
}

// ModalContent mounts fresh every time the modal opens, so useState(apiSettings)
// always picks up the latest stored settings without needing a useEffect sync.
function ModalContent({ initialSettings, onClose }: {
  initialSettings: ApiSettings
  onClose: () => void
}) {
  const { setApiSettings, showToast, addLog } = useSettingsStore()

  const [customPresets, setCustomPresets] = useState<ApiPreset[]>(() => loadCustomPresets())
  const [selectedPreset, setSelectedPreset] = useState<string>(() => resolvePresetId(loadCustomPresets()))
  const [baseURL, setBaseURL] = useState<string>(initialSettings.baseURL || '')
  const [apiKey, setApiKey] = useState<string>(initialSettings.apiKey || '')
  const [model, setModel] = useState<string>(initialSettings.model || '')
  const [presetName, setPresetName] = useState<string>('')
  const [models, setModels] = useState<string[]>([])
  const [isFetchingModels, setIsFetchingModels] = useState(false)

  const allPresets = [...BUILTIN_PRESET_CONFIGS, ...customPresets]
  const currentConfig = allPresets.find((c) => c.id === selectedPreset) || allPresets[0]
  const isCustomPreset = !currentConfig?.builtIn

  const persistSelectedPreset = (presetId: string) => {
    if (typeof window === 'undefined') return
    localStorage.setItem(SELECTED_PRESET_KEY, presetId)
  }

  const applyPresetToFields = (presetId: string) => {
    const preset = allPresets.find((c) => c.id === presetId)
    if (!preset) return
    setSelectedPreset(presetId)
    setBaseURL(preset.baseURL)
    setApiKey(preset.apiKey)
    setModel(preset.model || '')
    setPresetName(preset.label)
    setModels([])
  }

  const handlePresetChange = (presetId: string) => {
    applyPresetToFields(presetId)
  }

  const handleSave = () => {
    const nextSettings: ApiSettings = {
      baseURL: baseURL.trim(),
      apiKey: apiKey.trim(),
      model: model.trim(),
    }

    if (!nextSettings.baseURL) {
      showToast('error', 'Base URL 不能为空')
      return
    }

    setApiSettings(nextSettings)

    if (isCustomPreset) {
      const updated = customPresets.map((p) => (
        p.id === selectedPreset
          ? { ...p, label: presetName.trim() || p.label, baseURL: nextSettings.baseURL, apiKey: nextSettings.apiKey, model: nextSettings.model }
          : p
      ))
      setCustomPresets(updated)
      persistCustomPresets(updated)
      persistSelectedPreset(selectedPreset)
    } else {
      persistSelectedPreset(selectedPreset)
    }

    showToast('success', '设置已保存')
    addLog('info', `API 设置已更新: preset=${currentConfig.label}, baseURL=${nextSettings.baseURL}, model=${nextSettings.model || '默认'}`)
    onClose()
  }

  const handleSaveAsPreset = () => {
    const name = presetName.trim()
    if (!name) {
      showToast('error', '请输入预设名称')
      return
    }

    const preset: ApiPreset = {
      id: makePresetId(name),
      label: name,
      baseURL: baseURL.trim(),
      apiKey: apiKey.trim(),
      model: model.trim(),
      builtIn: false,
    }

    const next = [...customPresets.filter((p) => p.id !== preset.id), preset]
    setCustomPresets(next)
    persistCustomPresets(next)
    setSelectedPreset(preset.id)
    persistSelectedPreset(preset.id)
    setApiSettings({ baseURL: preset.baseURL, apiKey: preset.apiKey, model: preset.model })
    showToast('success', '已保存为新预设')
    addLog('info', `新建预设: ${preset.label}`)
  }

  const handleDeletePreset = () => {
    if (!isCustomPreset) {
      showToast('info', '内置预设不能删除')
      return
    }

    const next = customPresets.filter((p) => p.id !== selectedPreset)
    setCustomPresets(next)
    persistCustomPresets(next)

    const fallback = BUILTIN_PRESET_CONFIGS[0]
    applyPresetToFields(fallback.id)
    persistSelectedPreset(fallback.id)
    showToast('success', '预设已删除')
    addLog('info', `删除预设: ${currentConfig?.label || selectedPreset}`)
  }

  const handleFetchModels = async () => {
    setIsFetchingModels(true)
    setModels([])
    const baseURL = currentConfig.baseURL
    addLog('info', `正在获取模型列表: preset=${currentConfig.label}, baseURL=${baseURL}`)
    try {
      const response = await fetch('/api/game/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseURL,
          apiKey: currentConfig.apiKey,
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
        选择预设 API 配置。设置仅存储在本地浏览器中。
      </p>

      {/* 预设配置选择 */}
      <div className="mb-4">
        <label className="block text-sm text-[#a78bfa] mb-1">预设配置</label>
        <select
          value={selectedPreset}
          onChange={(e) => handlePresetChange(e.target.value)}
          className="w-full px-3 py-2 rounded-lg text-sm outline-none"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            color: 'var(--text-body)',
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--primary)')}
          onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
        >
          <optgroup label="内置预设">
            {BUILTIN_PRESET_CONFIGS.map((preset) => (
              <option key={preset.id} value={preset.id}>{preset.label}</option>
            ))}
          </optgroup>
          {customPresets.length > 0 && (
            <optgroup label="自定义预设">
              {customPresets.map((preset) => (
                <option key={preset.id} value={preset.id}>{preset.label}</option>
              ))}
            </optgroup>
          )}
        </select>
      </div>

      {/* 基础配置 */}
      <div className="mb-4 grid grid-cols-1 gap-3">
        <div>
          <label className="block text-sm text-[#a78bfa] mb-1">Base URL</label>
          <input
            type="text"
            value={baseURL}
            onChange={(e) => setBaseURL(e.target.value)}
            placeholder="例如: https://api.siliconflow.cn/v1"
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              color: 'var(--text-body)',
            }}
          />
        </div>
        <div>
          <label className="block text-sm text-[#a78bfa] mb-1">API Key</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="输入 API Key"
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              color: 'var(--text-body)',
            }}
          />
        </div>
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
            value={model}
            onChange={(e) => setModel(e.target.value)}
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
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="例如: gpt-4o-mini（留空使用默认）"
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              color: 'var(--text-body)',
            }}
          />
        )}
      </div>

      {/* 自定义预设 */}
      <div className="mb-4 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}>
        <div className="text-sm text-[#a78bfa] mb-2">自定义预设</div>
        <input
          type="text"
          value={presetName}
          onChange={(e) => setPresetName(e.target.value)}
          placeholder={isCustomPreset ? '当前预设名称（可改名）' : '输入新预设名称'}
          className="w-full px-3 py-2 rounded-lg text-sm outline-none mb-3"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            color: 'var(--text-body)',
          }}
        />
        <div className="flex gap-2">
          <button className="btn-ghost btn-sm flex-1" onClick={handleSaveAsPreset}>
            另存为新预设
          </button>
          <button className="btn-ghost btn-sm flex-1" onClick={handleSave}>
            保存当前设置
          </button>
        </div>
        <div className="mt-2 flex gap-2">
          <button className="btn-ghost btn-sm flex-1" onClick={handleDeletePreset}>
            删除当前预设
          </button>
        </div>
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
