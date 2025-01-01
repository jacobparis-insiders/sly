import {
  streamText as _streamText,
  convertToCoreMessages,
  generateText as _generateText,
} from "ai"
import { getAnthropicModel } from "./model.server"
import { getAnthropicApiKey } from "./api-key.server"
import { MAX_TOKENS } from "./constants.server"
import { getSystemPrompt } from "./prompts.server"

export type Messages = Parameters<typeof convertToCoreMessages>[0]

export type StreamingOptions = Omit<
  Parameters<typeof _streamText>[0],
  "model" | "headers" | "messages"
>

export async function streamText(
  messages: Messages,
  options?: StreamingOptions,
) {
  return _streamText({
    model: getAnthropicModel(getAnthropicApiKey()),
    system: getSystemPrompt(),
    maxTokens: MAX_TOKENS,
    headers: {
      "anthropic-beta": "max-tokens-3-5-sonnet-2024-07-15",
    },
    messages: convertToCoreMessages(messages),
    ...options,
  })
}

export async function generateText(
  messages: Messages,
  options?: StreamingOptions,
) {
  return _generateText({
    model: getAnthropicModel(getAnthropicApiKey()),
    system: getSystemPrompt(),
    maxTokens: MAX_TOKENS,
    headers: {
      "anthropic-beta": "max-tokens-3-5-sonnet-2024-07-15",
    },
    messages: convertToCoreMessages(messages),
    ...options,
  })
}
