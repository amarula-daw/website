import assert from "node:assert/strict"
import { describe, it as test } from "node:test"

import type { Usage } from "./pricing"
import { meterStream } from "./proxy"

const sse = (events: object[]) =>
  events.map((event) => `event: x\ndata: ${JSON.stringify(event)}\n\n`).join("")

function streamOf(text: string, chunkSize = 7) {
  const bytes = new TextEncoder().encode(text)
  let offset = 0
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (offset >= bytes.length) return controller.close()
      controller.enqueue(bytes.slice(offset, (offset += chunkSize)))
    },
  })
}

describe("metering streamed replies", () => {
  test("passes the stream through and adds up its usage once", async () => {
    const text = sse([
      {
        type: "message_start",
        message: { usage: { input_tokens: 120, output_tokens: 1 } },
      },
      { type: "content_block_delta", delta: { text: "hi" } },
      { type: "message_delta", usage: { output_tokens: 42 } },
      { type: "message_stop" },
    ])
    const counted: Usage[] = []
    const out = await new Response(
      meterStream(streamOf(text), async (usage) => {
        counted.push(usage)
      })
    ).text()
    assert.equal(out, text)
    assert.deepEqual(counted, [{ input_tokens: 120, output_tokens: 42 }])
  })

  test("a reply the app stops reading is still counted", async () => {
    const counted: Usage[] = []
    const stream = meterStream(
      streamOf(
        sse([
          {
            type: "message_start",
            message: { usage: { input_tokens: 50, output_tokens: 1 } },
          },
        ]) + 'data: {"type":"ping"}\n\n'.repeat(50)
      ),
      async (usage) => {
        counted.push(usage)
      }
    )
    const reader = stream.getReader()
    for (let i = 0; i < 30; i++) await reader.read()
    await reader.cancel()
    assert.deepEqual(counted, [{ input_tokens: 50, output_tokens: 1 }])
  })
})
