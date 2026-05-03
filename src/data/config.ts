// 游戏配置常量 - 反编译自 re.maa-ai.com

export const GAME_CONFIG = {
  maxBaseAttribute: 10,      // 单项初始属性最大值
  totalAttributePoints: 12,  // 初始分配总属性点
  talentSelectCount: 3,      // 可选天赋数
  decisionIntervalYears: [3, 5] as [number, number], // 每次决策的年数范围
  aiMaxBatchYears: 10,       // AI 一次生成的最大年数
  saveVersion: 2,            // 存档版本
} as const

// 性别选项
export interface GenderOption {
  label: string
  icon: string
  description: string
}

export const genderOptions: GenderOption[] = [
  { label: "男", icon: "🧑", description: "男性的身体" },
  { label: "女", icon: "👩", description: "女性的身体" },
  { label: "其他", icon: "🧝", description: "不拘性别，自由灵魂" },
]

// 种族选项 (各世界的特殊种族在下方定义)
export const raceOptions: Record<string, { label: string; icon: string; description: string }[]> = {
  modern: [
    { label: "汉族", icon: "🏮", description: "中国主要民族" },
    { label: "少数民族", icon: "🎭", description: "丰富多彩的少数民族文化" },
    { label: "混血", icon: "🌍", description: "多元文化背景" },
  ],
  xianxia: [
    { label: "凡人", icon: "👤", description: "普通凡人种族" },
    { label: "灵体", icon: "✨", description: "天生灵体，修炼极快" },
    { label: "妖族", icon: "🐉", description: "修炼成精的妖族" },
    { label: "魔族", icon: "👹", description: "天生魔体" },
  ],
  isekai: [
    { label: "原著主角", icon: "⭐", description: "原剧情的主角" },
    { label: "炮灰", icon: "💀", description: "剧情里的炮灰角色" },
    { label: "配角", icon: "🎭", description: "原著里的辅助角色" },
    { label: "反派", icon: "😈", description: "原著中的反派" },
    { label: "路人甲", icon: "👤", description: "原著里毫无存在感的路人" },
  ],
  palace: [
    { label: "秀女", icon: "🌸", description: "出身清白，选秀入宫" },
    { label: "官家小姐", icon: "👑", description: "朝中重臣之女" },
    { label: "商贾之女", icon: "💰", description: "富商之女，资财丰厚" },
    { label: "宫女", icon: "🎀", description: "从宫女做起" },
  ],
  magic: [
    { label: "人类", icon: "🧑", description: "普通人类法师" },
    { label: "精灵", icon: "🧝", description: "长寿命，擅长魔法" },
    { label: "矮人", icon: "⛏️", description: "善于锻造，抗魔" },
    { label: "兽人", icon: "🦴", description: "体力强大" },
    { label: "龙裔", icon: "🐉", description: "拥有龙的血脉" },
  ],
  medieval: [
    { label: "贵族", icon: "👑", description: "出身高贵的贵族" },
    { label: "骑士", icon: "⚔️", description: "荣誉至上的骑士" },
    { label: "平民", icon: "👤", description: "普通平民出身" },
    { label: "教士", icon: "⛪", description: "神职人员" },
    { label: "商贾", icon: "💰", description: "通商致富的商人" },
  ],
  cyberpunk: [
    { label: "街头小子", icon: "🔫", description: "混迹街头的底层" },
    { label: "企业特工", icon: "🏢", description: "大企业的特工" },
    { label: "自由黑客", icon: "💻", description: "不受约束的黑客" },
    { label: "义体医生", icon: "🔧", description: "专业的义体医生" },
    { label: "艺人", icon: "🎤", description: "夜之城中的表演者" },
  ],
  space: [
    { label: "地球人", icon: "🌍", description: "出生在地球的人类" },
    { label: "火星殖民者", icon: "🔴", description: "火星出生的殖民者" },
    { label: "星际商人", icon: "🚀", description: "商人世家" },
    { label: "外星混血", icon: "👽", description: "拥有外星血统" },
    { label: "AI 觉醒者", icon: "🤖", description: "自我意识觉醒的 AI" },
  ],
  wasteland: [
    { label: "避难所居民", icon: "🏠", description: "来自地下避难所" },
    { label: "废土原住民", icon: "🏜️", description: "世代生活在废土" },
    { label: "游荡者", icon: "🎒", description: "四处流浪的幸存者" },
    { label: "科研人员", icon: "🔬", description: "旧时代的科学家后代" },
    { label: "变种人", icon: "🧬", description: "辐射导致的变异人类" },
  ],
}

export const customWorldRaceOptions = [
  { label: "普通", icon: "👤", description: "最常见的种族" },
  { label: "特殊", icon: "✨", description: "拥有特殊能力或背景" },
]

// 游戏阶段枚举
export type GamePhase = 'idle' | 'identity' | 'attributes' | 'talents' | 'preview' | 'playing' | 'review'
