import { NextRequest } from 'next/server'
import { streamAI, buildGeneratePrompt } from '../api'

// POST /api/game/generate
// 生成游戏事件 (SSE Streaming)
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { apiSettings, ...gameBody } = body

  const messages = buildGeneratePrompt(gameBody)

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of streamAI({ messages, temperature: 0.85, maxTokens: 2048, apiSettings })) {
          const data = JSON.stringify({ text: chunk })
          controller.enqueue(encoder.encode(`data: ${data}\n\n`))
        }
        controller.enqueue(encoder.encode(`data: [DONE]\n\n`))
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        const data = JSON.stringify({ error: msg })
        controller.enqueue(encoder.encode(`data: ${data}\n\n`))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
