import readline from "node:readline"

const answers = {
  yes: ["yes", "y"],
  no: ["no", "n"],
}

export async function ask(
  question: string,
  options: {
    defaultValue: boolean
  } = { defaultValue: false }
) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise<boolean>((resolve) => {
    rl.question(
      question + " " + (options.defaultValue ? "[Y/n]" : "[y/N]"),
      async (answer) => {
        rl.close()

        const cleaned = answer.trim().toLowerCase()

        if (cleaned == "" && options.defaultValue != null)
          return resolve(options.defaultValue)

        if (answers.yes.indexOf(cleaned) >= 0) return resolve(true)

        if (answers.no.indexOf(cleaned) >= 0) return resolve(false)

        process.stdout.write("\nInvalid Response.\n")
        process.stdout.write(
          "Answer either yes : (" + answers.yes.join(", ") + ") \n"
        )
        process.stdout.write("Or no: (" + answers.no.join(", ") + ") \n\n")

        const result = await ask(question, options)
        resolve(result)
      }
    )
  })
}

export async function confirm(question: string) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise<void>((resolve) => {
    rl.question(question, () => {
      rl.close()
      resolve()
    })
  })
}
