export function getAnthropicApiKey() {
  // TODO: use secret store?
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set")
  }

  return process.env.ANTHROPIC_API_KEY
}
