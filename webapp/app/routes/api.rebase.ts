import { MAX_RESPONSE_SEGMENTS, MAX_TOKENS } from "#app/llm/constants.server.js"
import {
  getContinuePrompt,
  getDiffApplicationPrompt,
} from "#app/llm/prompts.server.js"
import type { StreamingOptions } from "#app/llm/stream-text.js"
import { streamText } from "#app/llm/stream-text.js"
import SwitchableStream from "#app/llm/switchable-stream.js"
import type { ActionFunctionArgs } from "@vercel/remix"

export async function action(args: ActionFunctionArgs) {
  return chatAction(args)
}

async function chatAction({ request }: ActionFunctionArgs) {
  const { prompt } = await request.json()
  // TODO: Validate prompt
  const { diff, base } = JSON.parse(prompt)

  const messages: Array<{
    role: "user" | "assistant"
    content: string
  }> = [
    {
      role: "user",
      content: getDiffApplicationPrompt({ base, diff }),
    },
  ]

  const stream = new SwitchableStream()

  try {
    const options: StreamingOptions = {
      maxRetries: 3,
      toolChoice: "none",
      onFinish: async ({ text: content, finishReason }) => {
        if (finishReason !== "length") {
          return stream.close()
        }

        if (stream.switches >= MAX_RESPONSE_SEGMENTS) {
          throw Error("Cannot continue message: Maximum segments reached")
        }

        const switchesLeft = MAX_RESPONSE_SEGMENTS - stream.switches

        console.log(
          `Reached max token limit (${MAX_TOKENS}): Continuing message (${switchesLeft} switches left)`,
        )

        messages.push({ role: "assistant", content })
        messages.push({ role: "user", content: getContinuePrompt() })

        const result = await streamText(messages, options)

        return stream.switchSource(result.toDataStream())
      },
    }

    const result = await streamText(messages, options)

    stream.switchSource(result.toDataStream())

    return new Response(stream.readable, {
      status: 200,
      headers: {
        contentType: "text/plain; charset=utf-8",
      },
    })
  } catch (error) {
    throw new Response(null, {
      status: 500,
      statusText: "Internal Server Error",
    })
  }
}
