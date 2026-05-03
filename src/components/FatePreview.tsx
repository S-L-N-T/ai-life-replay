'use client'

import { motion } from 'framer-motion'
import { useGameStore } from '@/store/gameStore'

export default function FatePreview({ onStart, onBack }: { onStart: () => void; onBack: () => void }) {
  const selectedWorld = useGameStore((s) => s.selectedWorld)
  const attributes = useGameStore((s) => s.attributes)
  const acquired = useGameStore((s) => s.acquiredAttributes)
  const selectedTalents = useGameStore((s) => s.selectedTalents)
  const background = useGameStore((s) => s.background)

  return (
    <div className="min-h-screen px-4 py-8 max-w-2xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6">
        <h1 className="text-2xl font-bold">命运预览</h1>
        <p className="text-sm text-[#8888aa]">确认以下设定，即可开始人生旅程</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
        <h2 className="text-lg font-semibold">世界</h2>
        <div className="card mt-2">
          <div className="flex items-center gap-3">
            <div className="text-3xl">{selectedWorld?.icon}</div>
            <div>
              <div className="font-semibold">{selectedWorld?.name}</div>
              <div className="text-xs text-[#666688]">{selectedWorld?.tagline}</div>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
        <h2 className="text-lg font-semibold">天赋</h2>
        <div className="grid grid-cols-3 gap-3 mt-2">
          {selectedTalents.map((t) => (
            <div key={t.id} className="card text-sm">
              <div className="font-semibold">{t.name}</div>
              <div className="text-xs text-[#666688] mt-1">{t.description}</div>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
        <h2 className="text-lg font-semibold">属性</h2>
        <div className="grid grid-cols-2 gap-3 mt-2">
          {attributes.map((a) => (
            <div key={a.key} className="card text-sm">
              <div className="flex justify-between">
                <div>{a.key}</div>
                <div className="font-semibold">{a.value}</div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h2 className="text-lg font-semibold">后天属性</h2>
        <div className="grid grid-cols-2 gap-3 mt-2">
          {Object.keys(acquired).map((k) => (
            <div key={k} className="card text-sm">
              <div className="flex justify-between">
                <div>{k}</div>
                <div className="font-semibold">{acquired[k]}</div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h2 className="text-lg font-semibold">背景摘录</h2>
        <div className="card mt-2 text-sm text-[#444]">
          {background ? <div>{background.slice(0, 260)}{background.length > 260 ? '...' : ''}</div> : <div className="text-[#888]">未生成背景</div>}
        </div>
      </motion.div>

      <div className="flex gap-3">
        <button className="btn-ghost flex-1" onClick={onBack}>← 返回</button>
        <button className="btn-primary flex-1" onClick={onStart}>开始人生 →</button>
      </div>
    </div>
  )
}
