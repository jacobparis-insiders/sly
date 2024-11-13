import { invariant } from "@epic-web/invariant"
import { Config } from "cosmiconfig/dist/types.js"
import { fromPromise } from "xstate"
import { chooseLibrary } from "../commands/library.js"

// TODO: should I pre-wrap these in fromPromise?
// or just consume them that way?
export const chooseLibrarySrc = fromPromise(
  async ({
    input,
  }: {
    input: { config: Config | undefined; type: "icon" | "component" }
  }) => {
    invariant(input.config, "Configuration not found")

    const libraries = [
      ...Object.keys(input.config.libraries).map((name) => ({ name })),
      { name: `\n    Configure ${input.type} libraries ->` },
    ]

    return await chooseLibrary(libraries)
  },
)
