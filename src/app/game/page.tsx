'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '@/store/gameStore'
import WorldSelection from '@/components/WorldSelection'
import AttrAllocation from '@/components/AttrAllocation'
import TalentSelection from '@/components/TalentSelection'
import GenderRaceSelection from '@/components/GenderRaceSelection'
import FatePreview from '@/components/FatePreview'
import GamePlay from '@/components/GamePlay'
import LifeSummary from '@/components/LifeSummary'
import { GAME_CONFIG } from '@/data/config'
import type { GamePhase } from '@/data/config'

export default function GamePage() {
  const router = useRouter()
  const phase = useGameStore((s) => s.phase)
  const setPhase = useGameStore((s) => s.setPhase)
  const selectedWorld = useGameStore((s) => s.selectedWorld)
  const resetGame = useGameStore((s) => s.resetGame)
  const loadFromLocalStorage = useGameStore((s) => s.loadFromLocalStorage)
  const attributes = useGameStore((s) => s.attributes)

  const [gamePhase, setGamePhase] = useState<GamePhase>('idle')
  const [hasSave, setHasSave] = useState(false)

  // 初始化 - 尝试读取存档
  useEffect(() => {
    if (loadFromLocalStorage()) {
      setGamePhase(useGameStore.getState().phase)
      setHasSave(true)
    } else if (!selectedWorld) {
      setGamePhase('idle')
    } else {
      setGamePhase(phase)
    }
  }, [])

  // 同步 store phase 到本地状态
  useEffect(() => {
    setGamePhase(phase)
  }, [phase])

  const handlePhaseTransition = (nextPhase: GamePhase) => {
    setPhase(nextPhase)
    setGamePhase(nextPhase)
  }

  // 阶段过渡
  const handleAttrNext = () => handlePhaseTransition('talents')
  const handleTalentNext = () => handlePhaseTransition('preview')
  const handleTalentBack = () => handlePhaseTransition('attributes')
  const handleGenderBack = () => handlePhaseTransition('idle')
  const handleGenderNext = () => {
    handlePhaseTransition('attributes')
  }

  // 世界选择后，跳过性别种族直接进入属性分配
  const originalSelectWorld = useGameStore.getState().selectWorld
  const handleWorldSelected = () => {
    // selectWorld 已经处理了 phase 变化（store 将进入 identity）
  }

  // 检查是否所有选择完成
  const allAttributesAssigned = () => {
    const remaining = GAME_CONFIG.totalAttributePoints - attributes.reduce((s, a) => s + a.value, 0)
    return remaining <= GAME_CONFIG.totalAttributePoints
  }

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToTop()
  }, [gamePhase])

  return (
    <div className="min-h-screen">
      <AnimatePresence mode="wait">
        {/* 世界选择 */}
        {gamePhase === 'idle' && (
          <motion.div
            key="world-selection"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <WorldSelection />
          </motion.div>
        )}

        {/* 属性分配 */}
        {gamePhase === 'attributes' && (
          <motion.div
            key="attr-allocation"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
          >
            <AttrAllocation onNext={handleAttrNext} />
          </motion.div>
        )}

        {/* 天赋选择 */}
        {gamePhase === 'talents' && (
          <motion.div
            key="talent-selection"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
          >
            <TalentSelection onNext={handleTalentNext} onBack={handleTalentBack} />
          </motion.div>
        )}

        {/* 身份设定（性别/种族/自定义） */}
        {gamePhase === 'identity' && (
          <motion.div
            key="identity"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
          >
            <GenderRaceSelection onNext={handleGenderNext} onBack={handleGenderBack} />
          </motion.div>
        )}

        {/* 命运预览 */}
        {gamePhase === 'preview' && (
          <motion.div
            key="fate-preview"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <FatePreview onStart={() => handlePhaseTransition('playing')} onBack={() => handlePhaseTransition('talents')} />
          </motion.div>
        )}

        {/* 游戏进行中 */}
        {gamePhase === 'playing' && (
          <motion.div
            key="game-play"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <GamePlay onReview={() => handlePhaseTransition('review')} />
          </motion.div>
        )}

        {/* 人生总结 */}
        {gamePhase === 'review' && (
          <motion.div
            key="life-summary"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <LifeSummary onRestart={() => {
              resetGame()
              setGamePhase('idle')
            }} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
