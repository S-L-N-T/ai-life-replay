import { NextRequest } from 'next/server'
import { streamAI, buildReviewPrompt } from '../api'

// POST /api/game/review
// 生成人生总结 (SSE Streaming)
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { apiSettings, ...gameBody } = body

  const messages = buildReviewPrompt(gameBody)

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        let fullText = ''
        for await (const chunk of streamAI({ messages, temperature: 0.7, maxTokens: 2048, apiSettings })) {
          fullText += chunk
          const data = JSON.stringify({ text: chunk })
          controller.enqueue(encoder.encode(`data: ${data}\n\n`))
        }
        controller.enqueue(encoder.encode(`data: [DONE]\n\n`))
      } catch (err: any) {
        const data = JSON.stringify({ error: err.message })
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
