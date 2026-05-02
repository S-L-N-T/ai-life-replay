'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '@/store/gameStore'
import { useSettingsStore } from '@/store/settingsStore'
import { generateBackground, generateEvents } from '@/lib/api'
import type { YearEvent } from '@/store/gameStore'

export default function GamePlay({
  onReview,
}: {
  onReview: () => void
}) {
  const selectedWorld = useGameStore((s) => s.selectedWorld)
  const gender = useGameStore((s) => s.gender)
  const race = useGameStore((s) => s.race)
  const customInfo = useGameStore((s) => s.customInfo)
  const attributes = useGameStore((s) => s.attributes)
  const selectedTalents = useGameStore((s) => s.selectedTalents)
  const acquiredAttributes = useGameStore((s) => s.acquiredAttributes)
  const setBackground = useGameStore((s) => s.setBackground)
  const setCharacter = useGameStore((s) => s.setCharacter)
  const background = useGameStore((s) => s.background)
  const currentAge = useGameStore((s) => s.currentAge)
  const setAge = useGameStore((s) => s.setAge)
  const maxAge = useGameStore((s) => s.maxAge)
  const yearEvents = useGameStore((s) => s.yearEvents)
  const addYearEvents = useGameStore((s) => s.addYearEvents)
  const setDead = useGameStore((s) => s.setDead)
  const isDead = useGameStore((s) => s.isDead)
  const setIsGenerating = useGameStore((s) => s.setIsGenerating)
  const isGenerating = useGameStore((s) => s.isGenerating)
  const setEnding = useGameStore((s) => s.setEnding)
  const saveToLocalStorage = useGameStore((s) => s.saveToLocalStorage)

  const [displayBg, setDisplayBg] = useState('')
  const [isGeneratingBg, setIsGeneratingBg] = useState(true)
  const [currentDisplay, setCurrentDisplay] = useState('')
  const [currentEventIdx, setCurrentEventIdx] = useState(0)
  const [lastDecisionAge, setLastDecisionAge] = useState(0)

  const abortRef = useRef<AbortController | null>(null)
  const displayRef = useRef('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const showToast = useSettingsStore((s) => s.showToast)
  const addLog = useSettingsStore((s) => s.addLog)

  // 滚动到底部
  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }, [])

  // 生成背景故事
  useEffect(() => {
    if (background) {
      // 已有背景跳过
      setIsGeneratingBg(false)
      return
    }

    const controller = new AbortController()
    abortRef.current = controller

    const attrMap: Record<string, number> = {}
    attributes.forEach((a) => { attrMap[a.key] = a.value })

    generateBackground(
      {
        worldLine: selectedWorld?.id || 'modern',
        talents: selectedTalents.map((t) => t.name),
        attributes: attrMap,
        gender,
        race,
        customInfo: customInfo || undefined,
      },
      (chunk) => {
        displayRef.current += chunk
        setDisplayBg(displayRef.current)
      },
      (fullText) => {
        setBackground(fullText)
        setDisplayBg(fullText)
        setIsGeneratingBg(false)
        // 自动推进到 0 岁
        setAge(0)
        setLastDecisionAge(0)
        // 生成第一个事件
        handleGenerateEvents(0, controller.signal)
      },
      (err) => {
        addLog('error', `背景故事生成失败: ${err}`)
        showToast('error', `背景生成失败: ${err}`)
        setIsGeneratingBg(false)
        // 即使失败也继续
        setAge(0)
        handleGenerateEvents(0)
      },
      controller.signal
    )

    return () => controller.abort()
  }, [])

  // 生成游戏事件
  const handleGenerateEvents = useCallback(
    async (fromAge: number, signal?: AbortSignal) => {
      if (!signal) {
        abortRef.current = new AbortController()
      }

      setIsGenerating(true)

      const attrMap: Record<string, number> = {}
      attributes.forEach((a) => { attrMap[a.key] = a.value })

      const historyText = yearEvents.map((e) => `[${e.age}岁] ${e.text}`)

      generateEvents(
        {
          worldLine: selectedWorld?.id || 'modern',
          currentAge: fromAge,
          maxYears: 10,
          attributes: attrMap,
          talents: selectedTalents.map((t) => t.name),
          acquiredAttributes,
          eventHistory: historyText,
          gender,
          race,
          background,
        },
        (chunk) => {
          setCurrentDisplay((prev) => prev + chunk)
        },
        (fullText) => {
          setCurrentDisplay('')
          setIsGenerating(false)
          // 解析 AI 返回的 JSON 事件
          try {
            const cleaned = fullText
              .replace(/```json/g, '')
              .replace(/```/g, '')
              .trim()
            const parsed = JSON.parse(cleaned)
            if (parsed.events && Array.isArray(parsed.events)) {
              const events: YearEvent[] = parsed.events.map((ev: any) => ({
                age: ev.age || fromAge,
                text: ev.text || '',
                choices: ev.choices
                  ? ev.choices.map((c: any) => ({
                      text: typeof c === 'string' ? c : c.text || '',
                      effect: c.effect || '',
                    }))
                  : undefined,
              }))
              addYearEvents(events)
              const lastAge = events[events.length - 1]?.age || fromAge
              setAge(lastAge)
              scrollToBottom()
            }
          } catch {
            // 如果解析失败，将原始文本作为事件展示
            const fallback: YearEvent = {
              age: fromAge,
              text: fullText,
            }
            addYearEvents([fallback])
            setAge(fromAge + 5)
            scrollToBottom()
          }
        },
        (err) => {
          addLog('error', `事件生成失败: ${err}`)
          showToast('error', `事件生成失败: ${err}`)
          setIsGenerating(false)
          // 即使失败也推进年龄
          setAge(fromAge + 5)
        },
        signal
      )
    },
    [
      selectedWorld,
      attributes,
      selectedTalents,
      acquiredAttributes,
      gender,
      race,
      background,
      yearEvents,
      setAge,
      setIsGenerating,
      addYearEvents,
      scrollToBottom,
      showToast,
      addLog,
    ]
  )

  // 处理选择
  const handleChoice = (eventIndex: number, choiceIndex: number) => {
    const store = useGameStore.getState()
    store.makeChoice(eventIndex, choiceIndex)

    const event = yearEvents[eventIndex]
    if (event) {
      setLastDecisionAge(event.age)
    }

    // 自动保存
    saveToLocalStorage()
    scrollToBottom()
  }

  // 继续游戏（推进到下一阶段）
  const handleContinue = () => {
    const nextAge = currentAge + 5
    if (nextAge >= maxAge) {
      // 到达最大年龄，自然死亡
      setAge(maxAge)
      setDead(true)
      setEnding('寿终正寝')
      saveToLocalStorage()
      onReview()
      return
    }

    setAge(nextAge)
    handleGenerateEvents(nextAge)
    scrollToBottom()
  }

  // 死亡事件
  const handleDeath = () => {
    setDead(true)
    // 生成结束事件
    const deathEvent: YearEvent = {
      age: currentAge,
      text: `在 ${currentAge} 岁时，你的人生走到了终点。`,
    }
    addYearEvents([deathEvent])
    saveToLocalStorage()

    setTimeout(() => {
      onReview()
    }, 2000)
  }

  const getAttrColor = (val: number) => {
    if (val >= 7) return '#f59e0b'
    if (val >= 4) return '#4ade80'
    return '#8888aa'
  }

  return (
    <div className="min-h-screen px-4 py-6 max-w-3xl mx-auto">
      {/* 角色信息头 */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-4 p-3 card"
        style={{ borderColor: 'var(--border-accent)' }}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{selectedWorld?.icon}</span>
          <div>
            <span className="font-semibold">{selectedWorld?.name}</span>
            <div className="text-xs text-[#666688]">
              {gender} · {race} · {currentAge}岁 / {maxAge}岁
            </div>
          </div>
        </div>
        <div className="flex gap-2 text-xs">
          {attributes.map((attr) => {
            const def = selectedWorld?.attributes.find((a) => a.key === attr.key)
            return (
              <span key={attr.key} style={{ color: getAttrColor(attr.value) }}>
                {def?.icon}{attr.value}
              </span>
            )
          })}
        </div>
      </motion.div>

      {/* 背景故事展示 */}
      {displayBg && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-6 p-4 card"
          style={{
            borderColor: 'rgba(167, 139, 250, 0.3)',
            background: 'rgba(167, 139, 250, 0.05)',
            fontFamily: "'Noto Serif SC', serif",
          }}
        >
          <div className="text-xs text-[#a78bfa] mb-2">📜 背景故事</div>
          <div className="text-sm leading-relaxed">
            {displayBg}
            {isGeneratingBg && <span className="typewriter" />}
          </div>
        </motion.div>
      )}

      {/* 事件流 */}
      <div className="space-y-3">
        {yearEvents.map((event, idx) => (
          <motion.div
            key={`${event.age}-${idx}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="event-card"
          >
            <div className="flex items-center gap-2 mb-2">
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{
                  background: 'rgba(124, 92, 191, 0.2)',
                  color: '#a78bfa',
                }}
              >
                {event.age} 岁
              </span>
              {event.chosenIndex !== undefined && (
                <span className="text-xs text-green-400">已做选择</span>
              )}
            </div>

            <p className="text-sm leading-relaxed mb-3">{event.text}</p>

            {/* 选择分支 */}
            {event.choices && event.chosenIndex === undefined && idx === yearEvents.length - 1 && (
              <div className="space-y-2 mt-3 pt-3 border-t border-[#2a2a4a]">
                <p className="text-xs text-[#8888aa] mb-2">你该怎么做？</p>
                {event.choices.map((choice, ci) => (
                  <button
                    key={ci}
                    className="choice-btn w-full"
                    onClick={() => handleChoice(idx, ci)}
                  >
                    <span className="text-[#a78bfa] mr-2">{['A', 'B', 'C'][ci]}.</span>
                    {choice.text}
                    {choice.effect && (
                      <span className="block text-xs text-[#666688] mt-0.5 ml-5">
                        {choice.effect}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        ))}

        {/* SSE 流式生成中的占位 */}
        {isGenerating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="event-card"
          >
            {currentDisplay ? (
              <p className="text-sm leading-relaxed">{currentDisplay}</p>
            ) : (
              <div className="flex items-center gap-2 text-[#8888aa]">
                <span className="w-2 h-2 rounded-full bg-[#a78bfa] animate-pulse" />
                <span className="w-2 h-2 rounded-full bg-[#a78bfa] animate-pulse" style={{ animationDelay: '0.2s' }} />
                <span className="w-2 h-2 rounded-full bg-[#a78bfa] animate-pulse" style={{ animationDelay: '0.4s' }} />
                <span className="text-xs ml-1">命运正在编织...</span>
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* 底部操作区 */}
      {!isGenerating && !isGeneratingBg && !isDead && yearEvents.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-6 space-y-3"
        >
          <button
            className="btn-primary w-full text-lg py-4"
            onClick={handleContinue}
          >
            {currentAge + 5 >= maxAge ? '⏳ 度过余生...' : `▶ 继续 (${currentAge + 3}~${currentAge + 5}岁)`}
          </button>

          <div className="flex gap-3">
            <button
              className="btn-ghost flex-1 btn-sm"
              onClick={() => {
                saveToLocalStorage()
                alert('游戏已保存！')
              }}
            >
              💾 保存
            </button>
            <button
              className="btn-ghost flex-1 btn-sm"
              style={{ borderColor: 'rgba(248, 113, 113, 0.3)', color: '#f87171' }}
              onClick={() => {
                if (confirm('确定要结束角色的人生吗？')) {
                  setEnding('主动选择结束')
                  setDead(true)
                  handleDeath()
                }
              }}
            >
              ✖ 结束人生
            </button>
          </div>
        </motion.div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}
