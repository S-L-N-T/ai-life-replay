// 游戏 API 路由定义
// 后端 API 逻辑 - 使用 OpenAI 兼容 API

import { NextRequest } from 'next/server'
import { deepTrim, normalizeBaseURL } from '@/lib/urlUtils'

// ============================================================
// 类型定义
// ============================================================

export interface CreateSessionRequest {
  worldLine: string
  gender?: string
  race?: string
}

export interface CreateSessionResponse {
  token: string
  expiresAt: number
}

export interface BackgroundRequest {
  worldLine: string
  talents: string[]
  attributes: Record<string, number>
  gender: string
  race: string
  customInfo?: string
}

export interface GenerateRequest {
  worldLine: string
  currentAge: number
  maxYears: number
  attributes: Record<string, number>
  talents: string[]
  acquiredAttributes: Record<string, number>
  eventHistory: string[]
  gender: string
  race: string
  background: string
}

export interface ReviewRequest {
  worldLine: string
  lifespan: number
  ending: string
  scores: {
    drama: number
    achievement: number
    impact: number
  }
  lifeSummary: string
  yearEvents: string[]
  attributes: Record<string, number>
  talents: string[]
  gender: string
  race: string
}

// ============================================================
// AI API 调用封装
// ============================================================

const AI_API_BASE = process.env.AI_API_BASE || 'https://ark.cn-beijing.volces.com/api/v3'
const AI_API_KEY = process.env.AI_API_KEY || ''
const AI_MODEL = process.env.AI_MODEL || 'doubao-seed-1-6-flash-250615'

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ApiSettingsOverride {
  baseURL?: string
  apiKey?: string
  model?: string
}

interface AIStreamOptions {
  messages: ChatMessage[]
  temperature?: number
  maxTokens?: number
  apiSettings?: ApiSettingsOverride
}

export async function* streamAI(options: AIStreamOptions): AsyncGenerator<string> {
  // Deep-trim to strip newlines, invisible Unicode chars, etc. before any URL work
  const baseURL = normalizeBaseURL(options.apiSettings?.baseURL ? deepTrim(options.apiSettings.baseURL) : (AI_API_BASE))
  const apiKey = options.apiSettings?.apiKey ? deepTrim(options.apiSettings.apiKey) : deepTrim(AI_API_KEY)
  const model = options.apiSettings?.model ? deepTrim(options.apiSettings.model) : deepTrim(AI_MODEL)

  // Validate baseURL to prevent SSRF – only http/https are permitted.
  // Note: the user-provided URL is intentionally forwarded so users can configure
  // their own AI API provider; the protocol check limits attack surface.
  try {
    const parsed = new URL(baseURL)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      throw new Error('不支持的 URL 协议，仅允许 http/https')
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '无效的 Base URL'
    throw new Error(msg)
  }

  const response = await fetch(`${baseURL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: options.messages,
      temperature: options.temperature ?? 0.8,
      max_tokens: options.maxTokens ?? 4096,
      stream: true,
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`AI API Error (${response.status}): ${errText}`)
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('No response body from AI API')

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6).trim()
        if (data === '[DONE]') return
        try {
          const parsed = JSON.parse(data)
          const content = parsed.choices?.[0]?.delta?.content || ''
          if (content) yield content
        } catch {
          // skip malformed lines
        }
      }
    }
  }
}

// ============================================================
// Session 管理 (简单实现)
// ============================================================

const sessions = new Map<string, number>()

function generateToken(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let token = ''
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return token
}

// ============================================================
// Prompt 模板
// ============================================================

function getWorldConfig(worldLine: string): { name: string; style: string; endings: string[]; maxAge: number } {
  const worlds: Record<string, { name: string; style: string; endings: string[]; maxAge: number }> = {
    modern: {
      name: '现代都市',
      style: '现实主义基调，关注升学、就业、恋爱、家庭、事业成就、退休等现实话题。可涉及社会热点（房价、创业、AI 浪潮等），幽默感偏社会讽刺和自嘲。角色体质 3+ 时 55 岁前不应因健康原因死亡。中年期（35-55）聚焦事业和家庭，不要反复安排疾病剧情。',
      endings: ['学术巅峰', '商业帝国', '星际移民', '意识永生', '功成身退', '著书传世'],
      maxAge: 90,
    },
    xianxia: {
      name: '九州仙域',
      style: '仙侠小说风格，涉及修炼境界提升、宗门争斗、秘境探险、丹药炼器、心魔渡劫。用"你"的视角叙述。术语如灵气、金丹、元婴等需自然融入。',
      endings: ['飞升仙界', '羽化登仙', '大能转世', '开宗立派', '化身天道'],
      maxAge: 130,
    },
    isekai: {
      name: '墨海浮生',
      style: '穿书/重生风格，带有自我意识和剧情认知。角色清楚原著走向，需要在已知剧情和蝴蝶效应之间权衡。可包含搞笑吐槽、系统元素、剧情偏离等。',
      endings: ['回到现实', '成为新主角', '黑化 boss', '平行世界定居', '与原著和解'],
      maxAge: 80,
    },
    palace: {
      name: '朱门深宫',
      style: '古典宫斗风格，涉及选秀册封、后宫争宠、朝堂权谋、家族兴衰。用"你"的视角，注重心理描写和计谋博弈。',
      endings: ['垂帘听政', '远嫁和亲', '一代贤后', '凤临天下'],
      maxAge: 70,
    },
    magic: {
      name: '奥术大陆',
      style: '西方奇幻魔法风格，涉及魔法学习、法术对战、学院生活、秘境探索、种族纷争。用"你"的视角，充满魔法描述和奇幻色彩。',
      endings: ['龙骑士', '元素归一', '大贤者', '位面行者'],
      maxAge: 110,
    },
    medieval: {
      name: '铁与火的纪元',
      style: '中世纪战争史诗风格，关注军事征战、政治联姻、城堡围攻、骑士精神、瘟疫/饥荒、信仰冲突。用"你"的视角，叙事直接有力。',
      endings: ['十字军英雄', '传奇王者', '隐世农夫', '圣殿守护', '海外建国'],
      maxAge: 60,
    },
    cyberpunk: {
      name: '夜之城 2099',
      style: '赛博朋克黑色电影风格，关注义体改造、网络入侵、企业阴谋、街头火拼、身份认同。用"你"的视角，带有科技感和荒诞感。',
      endings: ['上传意识', '系统崩溃', '街头传奇', '机械飞升'],
      maxAge: 100,
    },
    space: {
      name: '银河纪元',
      style: '太空歌剧科幻风格，关注星际航行、外星文明接触、太空战斗、殖民开拓、科技奇点。用"你"的视角，宏大叙事。',
      endings: ['星际流浪者', '虫洞殉难', '太空隐士'],
      maxAge: 110,
    },
    wasteland: {
      name: '废土末世',
      style: '废土末世生存风格，关注资源争夺、变异生物、幸存者营地、道德抉择、文明重建。用"你"的视角，叙事残酷但有力，偶尔有黑暗幽默。',
      endings: ['变异觉醒', '新文明奠基', '绿洲守护者', '星际逃离', '废土传奇'],
      maxAge: 50,
    },
  }

  return worlds[worldLine] || worlds.modern
}

export function buildBackgroundPrompt(req: BackgroundRequest): ChatMessage[] {
  const world = getWorldConfig(req.worldLine)
  const attrStr = Object.entries(req.attributes)
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ')

  const systemPrompt = `你是一个擅长撰写人生经历的叙事作家。你将以"你"（第二人称）的口吻，为用户生成一段角色背景故事。

世界设定：${world.name}
叙事风格：${world.style}

角色属性：${attrStr}
性别：${req.gender || '未指定'}
种族：${req.race || '未指定'}
天赋：${req.talents.join('、') || '无'}

请用第二人称"你"撰写一段约 200-300 字的角色背景故事，描述角色的出身背景、童年经历和重要早期转折。语言生动有代入感，符合世界设定和叙事风格。角色当前年龄为 0 岁。`

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `请为这个角色生成背景故事。` },
  ]
}

export function buildGeneratePrompt(req: GenerateRequest): ChatMessage[] {
  const world = getWorldConfig(req.worldLine)
  const attrStr = Object.entries(req.attributes)
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ')
  const acqStr = Object.entries(req.acquiredAttributes)
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ')

  const systemPrompt = `你是一个擅长叙事的人生模拟系统。你将以"你"（第二人称）的口吻，为用户生成接下来的人生事件。

世界设定：${world.name}
叙事风格：${world.style}
最大年龄：${world.maxAge} 岁

角色初始属性：${attrStr}
后天属性：${acqStr}
性别：${req.gender || '未指定'}
种族：${req.race || '未指定'}
天赋：${req.talents.join('、') || '无'}

角色背景：
${req.background}

当前年龄：${req.currentAge} 岁
游戏已进行的人生事件摘要：
${req.eventHistory.slice(-5).join('\n')}

请生成角色从 ${req.currentAge} 岁到 ${req.currentAge + req.maxYears} 岁之间的人生事件。注意：
1. 每次生成 1-2 个主要事件，每 3-5 年一个事件
2. 使用第二人称"你"叙述
3. 每个事件包含可选的 2-3 个选择分支（choices）
4. 事件应该符合角色的属性值和世界设定
5. 不要提前结束游戏，按正常人生轨迹推进
6. 如果有重要人生节点（升学、结婚、创业、突破等），描述详细一些

输出格式：
{
  "events": [
    {
      "age": 当前年龄,
      "text": "事件描述文本",
      "choices": [
        { "text": "选择A", "effect": "选择A的后果描述" },
        { "text": "选择B", "effect": "选择B的后果描述" },
        { "text": "选择C", "effect": "选择C的后果描述" }
      ]
    }
  ]
}`

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `请生成 ${req.currentAge} 岁到 ${req.currentAge + req.maxYears} 岁的事件。` },
  ]
}

export function buildReviewPrompt(req: ReviewRequest): ChatMessage[] {
  const world = getWorldConfig(req.worldLine)

  const systemPrompt = `你是一个人生评价系统。请为角色的完整人生做出总结评价。

世界设定：${world.name}

角色最终属性：${JSON.stringify(req.attributes)}
天赋：${req.talents.join('、') || '无'}
性别：${req.gender || '未指定'}
种族：${req.race || '未指定'}
享年：${req.lifespan} 岁
结局：${req.ending}

人生大事记：
${req.yearEvents.slice(-10).join('\n')}

请用 JSON 格式输出以下内容：
{
  "rating": "综合评价等级（SSS/SS/S/A+/A/B/C）",
  "tagline": "一句精辟的人生总结",
  "scores": {
    "drama": 戏剧性评分（0-100），
    "achievement": 成就评分（0-100），
    "impact": 影响力评分（0-100）
  },
  "highlights": ["3-5 条关键高光时刻或转折点"]
}`

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `请评价这个角色的人生。` },
  ]
}
