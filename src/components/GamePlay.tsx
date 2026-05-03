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
  const bufferedEvents = useGameStore((s) => s.bufferedEvents)
  const addYearEvents = useGameStore((s) => s.addYearEvents)
  const bufferedAddYearEvents = useGameStore((s) => s.bufferedAddYearEvents)
  const consumeBufferedEvent = useGameStore((s) => s.consumeBufferedEvent)
  const clearBufferedEvents = useGameStore((s) => s.clearBufferedEvents)
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
  const [customInputs, setCustomInputs] = useState<Record<number, string>>({})

  const abortRef = useRef<AbortController | null>(null)
  const prefetchLockRef = useRef(false)
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
        handleGenerateEvents(0, undefined, controller.signal)
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

  // 生成游戏事件（支持预取和重试）
  const handleGenerateEvents = useCallback(
    async (
      fromAge: number,
      options?: { buffer?: boolean; attempt?: number },
      signal?: AbortSignal
    ) => {
      const buffer = options?.buffer ?? false
      const attempt = options?.attempt ?? 0

      if (buffer && prefetchLockRef.current) return
      if (buffer) {
        prefetchLockRef.current = true
      } else {
        setIsGenerating(true)
      }

      const activeSignal = signal || (!buffer ? (abortRef.current = new AbortController(), abortRef.current.signal) : undefined)

      const attrMap: Record<string, number> = {}
      attributes.forEach((a) => { attrMap[a.key] = a.value })

      const historyText = yearEvents.map((e) => `[${e.age}岁] ${e.text}`)

      const releaseBufferLock = () => {
        if (buffer) prefetchLockRef.current = false
      }

      const retry = () => {
        if (attempt < 2) {
          releaseBufferLock()
          window.setTimeout(() => {
            handleGenerateEvents(fromAge, { buffer, attempt: attempt + 1 }, signal)
          }, 400)
          return true
        }
        return false
      }

      generateEvents(
        {
          worldLine: selectedWorld?.id || 'modern',
          currentAge: fromAge,
          maxYears: 1,
          attributes: attrMap,
          talents: selectedTalents.map((t) => t.name),
          acquiredAttributes,
          eventHistory: historyText,
          gender,
          race,
          background,
        },
        (chunk) => {
          if (!buffer) {
            setCurrentDisplay((prev) => prev + chunk)
          }
        },
        (fullText) => {
          if (!buffer) setCurrentDisplay('')

          const cleaned = fullText
            .replace(/```json/g, '')
            .replace(/```/g, '')
            .trim()

          try {
            if (!cleaned) throw new Error('返回内容为空')
            const parsed = JSON.parse(cleaned)
            const rawEvents = Array.isArray(parsed?.events) ? parsed.events : []
            if (rawEvents.length === 0) throw new Error('事件数组为空')

            const events: YearEvent[] = rawEvents.map((ev: any) => ({
              age: typeof ev.age === 'number' ? ev.age : fromAge,
              text: typeof ev.text === 'string' ? ev.text : '',
              choices: Array.isArray(ev.choices)
                ? ev.choices.map((c: any) => ({
                    text: typeof c === 'string' ? c : c?.text || '',
                    effect: typeof c === 'string' ? '' : c?.effect || '',
                    effects: Array.isArray(c?.effects)
                      ? c.effects
                          .map((ef: any) => ({
                            key: String(ef?.key || ''),
                            delta: Number(ef?.delta || 0),
                          }))
                          .filter((ef: { key: string; delta: number }) => ef.key)
                      : undefined,
                  }))
                : undefined,
            }))

            if (buffer) {
              clearBufferedEvents()
              bufferedAddYearEvents(events)
              saveToLocalStorage()
              return
            }

            setIsGenerating(false)
            addYearEvents(events)
            saveToLocalStorage()
            const lastAge = events[events.length - 1]?.age ?? fromAge + 1
            setAge(lastAge)
            scrollToBottom()

            const lastEvent = events[events.length - 1]
            if (!lastEvent?.choices || lastEvent.choices.length === 0) {
              const nextAge = lastAge + 1
              if (nextAge <= maxAge) {
                handleGenerateEvents(nextAge, { buffer: true, attempt: 0 })
              }
            }
          } catch (err) {
            if (retry()) return

            if (!buffer) {
              addLog('error', `事件生成失败: ${err instanceof Error ? err.message : '解析失败'}`)
              showToast('error', '事件生成失败，已回退到简化事件')
              const fallback: YearEvent = {
                age: fromAge + 1,
                text: fullText || '这一年没有成功生成详细事件。',
              }
              addYearEvents([fallback])
              saveToLocalStorage()
              setAge(fromAge + 1)
              scrollToBottom()
            }
          } finally {
            releaseBufferLock()
          }
        },
        (err) => {
          if (retry()) return
          addLog('error', `事件生成失败: ${err}`)
          showToast('error', `事件生成失败: ${err}`)
          if (!buffer) {
            setIsGenerating(false)
            setAge(fromAge + 1)
          }
          releaseBufferLock()
        },
        activeSignal
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
      maxAge,
      setAge,
      setIsGenerating,
      addYearEvents,
      bufferedAddYearEvents,
      clearBufferedEvents,
      scrollToBottom,
      showToast,
      addLog,
    ]
  )

  // 处理选择
  const handleChoice = (eventIndex: number, choiceIndex: number, customChoice?: string) => {
    const store = useGameStore.getState()
    store.makeChoice(eventIndex, choiceIndex, customChoice)

    const event = yearEvents[eventIndex]
    if (event) {
      setLastDecisionAge(event.age)
      const nextAge = event.age + 1
      const nextBuffered = bufferedEvents[0]
      if (nextAge <= maxAge && (!nextBuffered || nextBuffered.age !== nextAge)) {
        handleGenerateEvents(nextAge, { buffer: true, attempt: 0 })
      }
    }

    // 自动保存
    saveToLocalStorage()
    scrollToBottom()
  }

  // 继续游戏（推进到下一岁）
  const handleContinue = () => {
    const nextAge = currentAge + 1
    if (nextAge >= maxAge) {
      // 到达最大年龄，自然死亡
      setAge(maxAge)
      setDead(true)
      setEnding('寿终正寝')
      saveToLocalStorage()
      onReview()
      return
    }

    const buffered = bufferedEvents[0]
    if (buffered && buffered.age === nextAge) {
      const event = consumeBufferedEvent()
      if (event) {
        addYearEvents([event])
        setAge(event.age)
        saveToLocalStorage()
        scrollToBottom()
        if (!event.choices || event.choices.length === 0) {
          const followingAge = event.age + 1
          if (followingAge <= maxAge) {
            handleGenerateEvents(followingAge, { buffer: true, attempt: 0 })
          }
        }
        return
      }
    }

    handleGenerateEvents(currentAge)
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

  // 解析 effect 文本为结构化数组 [{ key, delta, label }]
  function parseEffects(effectText?: string | undefined) {
    if (!effectText) return [] as { key: string; delta: number; label?: string }[]
    const res: { key: string; delta: number; label?: string }[] = []
    const parts = effectText.split(/[,;，；\n]/)
    for (const p of parts) {
      const m = p.match(/([a-zA-Z\u4e00-\u9fa5_\-]+)\s*[:：]?\s*([+-]?\d+)/)
      if (m) {
        const rawKey = m[1].trim()
        const delta = parseInt(m[2], 10) || 0
        res.push({ key: rawKey, delta, label: rawKey })
      }
    }
    return res
  }

  function getDisplayEffects(choice: any) {
    const fromStructured: { key: string; delta: number; label?: string }[] = (choice && choice.effects) || []
    const fromText = parseEffects(choice?.effect)
    // if structured exists, prefer it but normalize label
    const normalized = fromStructured.length ? fromStructured.map((e) => ({ ...e, label: e.label || e.key })) : fromText
    return normalized
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
                <span className="text-xs text-green-400">
                  已做选择
                  {event.customChoice ? ` · ${event.customChoice}` : ''}
                </span>
              )}
            </div>

            <p className="text-sm leading-relaxed mb-3">{event.text}</p>

            {/* 选择分支 */}
            {event.choices && event.chosenIndex === undefined && idx === yearEvents.length - 1 && (
              <div className="space-y-3 mt-3 pt-3 border-t border-[#2a2a4a]">
                <p className="text-xs text-[#8888aa] mb-2">你该怎么做？</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {event.choices.slice(0, 3).map((choice, ci) => (
                    <div
                      key={ci}
                      className="choice-card p-3 rounded-lg border cursor-pointer"
                      onClick={() => handleChoice(idx, ci)}
                      style={{ borderColor: 'rgba(167,139,250,0.15)' }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-lg font-bold text-[#a78bfa]">{['A', 'B', 'C'][ci]}</div>
                        <div className="flex-1 text-sm">
                          <div className="font-medium mb-1">{choice.text}</div>
                          {choice.effect && (
                            <div className="text-xs text-[#666688]">{choice.effect}</div>
                          )}
                          {/* 显示属性变化徽章（尝试解析结构化 effects 或 effect 文本） */}
                          <div className="mt-2 flex gap-2 flex-wrap">
                            {getDisplayEffects(choice).map((ef, i) => (
                              <span key={i} className="text-xs px-2 py-0.5 rounded-full" style={{ background: ef.delta > 0 ? 'rgba(34,197,94,0.12)' : 'rgba(248,113,113,0.08)', color: ef.delta > 0 ? '#22c55e' : '#f87171', border: '1px solid rgba(0,0,0,0.06)' }}>
                                {ef.label || ef.key} {ef.delta > 0 ? `+${ef.delta}` : ef.delta}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* 自定义输入卡片 D */}
                  <div className="choice-card p-3 rounded-lg border" style={{ borderColor: 'rgba(167,139,250,0.08)' }}>
                    <div className="flex items-start gap-3">
                      <div className="text-lg font-bold text-[#a78bfa]">D</div>
                      <div className="flex-1 text-sm">
                        <div className="font-medium mb-2">自定义输入</div>
                        <div className="text-xs text-[#666688] mb-2">由你填写具体行动、回答或决定</div>
                        <textarea
                          value={customInputs[idx] || ''}
                          onChange={(e) => setCustomInputs((s) => ({ ...s, [idx]: e.target.value }))}
                          className="w-full rounded-md p-2 text-sm"
                          placeholder="输入你的自定义选择，然后点击确认"
                          rows={3}
                        />
                        <div className="flex gap-2 mt-2">
                          <button
                            className="btn-ghost btn-sm"
                            onClick={() => setCustomInputs((s) => ({ ...s, [idx]: '' }))}
                          >
                            清空
                          </button>
                          <button
                            className="btn-primary btn-sm"
                            onClick={() => {
                              const txt = (customInputs[idx] || '').trim()
                              if (txt) handleChoice(idx, 3, txt)
                            }}
                            disabled={!((customInputs[idx] || '').trim())}
                          >确认选择</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
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
      {!isGenerating && !isGeneratingBg && !isDead && yearEvents.length > 0 && (!yearEvents[yearEvents.length - 1]?.choices || yearEvents[yearEvents.length - 1]?.chosenIndex !== undefined) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-6 space-y-3"
        >
          <button
            className="btn-primary w-full text-lg py-4"
            onClick={handleContinue}
          >
            {currentAge + 1 >= maxAge ? '⏳ 度过余生...' : `▶ 下一岁 (${currentAge + 1}岁)`}
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
