import { invariant } from "@epic-web/invariant"
import { emit, fromPromise } from "xstate"
import { chooseLibrary } from "../commands/library.js"
import { Config, LibraryConfig } from "../get-config.js"

export function createChooseLibrarySrc({
  filter,
  extraItems,
}: {
  filter: (config: Partial<LibraryConfig> & { name: string }) => boolean
  extraItems?: Array<{ name: string }>
}) {
  return fromPromise(async ({ input, self }) => {
    self._parent?.send({ type: "setActiveActor", output: self })
    self._parent?.send({ type: "log", message: "Choosing library..." })
    invariant(input.config, "Configuration not found")

    const libraries = [
      ...Object.entries(input.config.libraries)
        .filter(([name, config]) => filter({ ...config, name }))
        .map(([name]) => ({ name })),
      ...(extraItems || []),
    ]

    return await chooseLibrary(libraries)
  })
}
