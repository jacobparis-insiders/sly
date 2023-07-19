import prompts from "prompts"

export async function confirmOrQuit(message: string) {
  const proceed = await confirm(message)

  if (!proceed) {
    process.exit(0)
  }
}

export async function confirm(message: string) {
  if (process.env.YES) return true

  const { proceed } = await prompts({
    type: "confirm",
    name: "proceed",
    message,
    initial: true,
  })

  return Boolean(proceed)
}
