import prompts from "prompts"

export async function confirmationPrompt(message: string) {
  if (process.env.YES) return

  const { proceed } = await prompts({
    type: "confirm",
    name: "proceed",
    message,
    initial: true,
  })

  if (!proceed) {
    process.exit(0)
  }
}
