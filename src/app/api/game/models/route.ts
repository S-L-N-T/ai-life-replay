import { NextRequest, NextResponse } from 'next/server'

// POST /api/game/models
// 获取可用模型列表（从自定义 AI API 获取）
export async function POST(request: NextRequest) {
  let body: { baseURL?: string; apiKey?: string } = {}
  try {
    body = await request.json()
  } catch {
    // body 可能为空
  }

  const AI_API_BASE = process.env.AI_API_BASE || 'https://ark.cn-beijing.volces.com/api/v3'
  const AI_API_KEY = process.env.AI_API_KEY || ''

  const baseURL = body.baseURL?.trim() || AI_API_BASE
  const apiKey = body.apiKey?.trim() || AI_API_KEY

  if (!apiKey) {
    return NextResponse.json({ error: 'API Key 未配置' }, { status: 400 })
  }

  // Validate baseURL to prevent SSRF – only http/https are permitted
  try {
    const parsed = new URL(baseURL)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return NextResponse.json({ error: '不支持的 URL 协议，仅允许 http/https' }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: '无效的 Base URL' }, { status: 400 })
  }

  try {
    const response = await fetch(`${baseURL}/models`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errText = await response.text()
      return NextResponse.json(
        { error: `获取模型列表失败 (${response.status}): ${errText}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    // 兼容 OpenAI 格式: { data: [ { id: '...', object: 'model' } ] }
    const models: string[] = (data.data || [])
      .map((m: { id?: string; name?: string } | string) =>
        typeof m === 'string' ? m : m.id || m.name || ''
      )
      .filter(Boolean)

    return NextResponse.json({ models })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '未知错误'
    return NextResponse.json(
      { error: `请求失败: ${msg}` },
      { status: 500 }
    )
  }
}
