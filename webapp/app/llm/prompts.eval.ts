import { evalite } from "evalite"
import { Levenshtein } from "autoevals"
import { generateText } from "./stream-text"
import { getDiffApplicationPrompt } from "./prompts.server"

evalite("diffApplication", {
  // A function that returns an array of test data
  // - TODO: Replace with your test data
  data: async () => {
    return [
      {
        input: {
          base: `
@tailwind base;
@tailwind components;
@tailwind utilities;
`,
          diff: `
@tailwind base;
[- @tailwind components;-]
@tailwind utilities;
`,
        },
        expected: `
@tailwind base;
@tailwind utilities;
`,
      },
    ]
  },
  // The task to perform
  // - TODO: Replace with your LLM call
  task: async (input) => {
    const { base, diff } = input
    const result = await generateText([
      {
        role: "user",
        content: getDiffApplicationPrompt({ base, diff }),
      },
    ])

    return result.text
  },
  // The scoring methods for the eval
  scorers: [Levenshtein],
})
