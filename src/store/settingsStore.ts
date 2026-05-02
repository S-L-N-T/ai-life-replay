// 设置、日志、Toast 状态管理
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ============================================================
// 类型定义
// ============================================================

export interface ApiSettings {
  baseURL: string
  apiKey: string
  model: string
}

export interface LogEntry {
  id: string
  timestamp: number
  level: 'info' | 'warn' | 'error'
  message: string
}

export interface ToastItem {
  id: string
  type: 'error' | 'success' | 'info'
  message: string
}

// ============================================================
// Store 接口
// ============================================================

interface SettingsStore {
  // API 设置
  apiSettings: ApiSettings
  setApiSettings: (settings: Partial<ApiSettings>) => void

  // 日志
  logs: LogEntry[]
  addLog: (level: LogEntry['level'], message: string) => void
  clearLogs: () => void

  // UI 面板状态
  isSettingsOpen: boolean
  setIsSettingsOpen: (open: boolean) => void
  isLogOpen: boolean
  setIsLogOpen: (open: boolean) => void

  // Toast 通知
  toasts: ToastItem[]
  showToast: (type: ToastItem['type'], message: string) => void
  dismissToast: (id: string) => void
}

// ============================================================
// 创建 Store（设置持久化，其余状态不持久化）
// ============================================================

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      apiSettings: {
        baseURL: '',
        apiKey: '',
        model: '',
      },

      setApiSettings: (settings) =>
        set((state) => ({
          apiSettings: { ...state.apiSettings, ...settings },
        })),

      logs: [],
      addLog: (level, message) => {
        const entry: LogEntry = {
          id: Math.random().toString(36).slice(2, 10),
          timestamp: Date.now(),
          level,
          message,
        }
        // 最多保留 500 条日志
        set((state) => ({ logs: [...state.logs.slice(-499), entry] }))
      },
      clearLogs: () => set({ logs: [] }),

      isSettingsOpen: false,
      setIsSettingsOpen: (open) => set({ isSettingsOpen: open }),
      isLogOpen: false,
      setIsLogOpen: (open) => set({ isLogOpen: open }),

      toasts: [],
      showToast: (type, message) => {
        const id = Math.random().toString(36).slice(2, 10)
        set((state) => ({
          toasts: [...state.toasts, { id, type, message }],
        }))
        // 4 秒后自动消失
        setTimeout(() => {
          get().dismissToast(id)
        }, 4000)
      },
      dismissToast: (id) =>
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        })),
    }),
    {
      name: 'ai-life-api-settings',
      // 只持久化 API 设置，日志和 UI 状态不存储
      partialize: (state) => ({ apiSettings: state.apiSettings }),
    }
  )
)
