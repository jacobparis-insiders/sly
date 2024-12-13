import { assign, fromPromise, setup } from "xstate"
import {
  Config,
  getConfig,
  resolveLibraryConfig,
  resolveLibraryUrls,
} from "~/src/get-config.js"
import { logger } from "~/src/logger.js"
import { fetchTree } from "~/src/registry.js"
import { execa } from "execa"
import prompts from "prompts"
import * as z from "zod"
import { resolveTransformers } from "~/src/transformers.js"
import { configureComponentLibraries, initLibrary } from "./library.js"
import { confirmOrQuit } from "../prompts.js"

import type { Transformer } from "~/src/index.js"
import { invariant } from "@epic-web/invariant"
import {
  libraryItemSchema,
  libraryItemWithContentSchema,
} from "site/app/schemas.js"
import { createChooseLibrarySrc } from "../actors/choose-library-src.js"
import {
  installComponents,
  installComponentsSrc,
} from "../actors/install-components-src.js"
type Component = z.infer<typeof libraryItemWithContentSchema>

export const addComponentMachine = setup({
  types: {
    input: {} as {
      libArg?: string
      itemsArg?: string[]
      targetDir?: string
    },
    context: {} as {
      config: Config | undefined
      packageManager: "npm" | "bun" | "pnpm" | "yarn" | undefined
      payload: Component[]
      library: string | undefined
      targetDir: string | undefined
      transformers: Array<{ default: Transformer }>
      selectedComponents: string[]
      error: string | undefined
    },
  },
  actions: {
    exitWithError: ({ context }) => {
      logger.error(context.error)
      process.exit(1)
    },
    exitGracefully: () => {
      process.exit(0)
    },
    setError: assign({
      error: ({ event }) => event.error as string,
    }),
  },
  actors: {
    loadConfigurationSrc: fromPromise(async () => {
      const config = await getConfig()

      return config
    }),
    configureLibrariesSrc: fromPromise(async () => {
      await configureComponentLibraries()
      const config = await getConfig()
      return config
    }),
    chooseLibrarySrc: createChooseLibrarySrc({
      filter: (config) => {
        if (config.registryUrl?.includes("//github.com")) {
          return false
        }

        return true
      },
    }),
    selectComponentsSrc: fromPromise(
      async ({
        input,
      }: {
        input: {
          library: string
          config: Config
        }
      }) => {
        const libraryIndex = await getComponentLibraryIndex(input.library)

        const response = await prompts({
          type: "autocompleteMultiselect",
          name: "components",
          message: "Which items would you like to add?",
          hint: "Space to select. A to toggle all. Enter to submit.",
          instructions: false,
          choices:
            libraryIndex?.resources.map((entry) => ({
              title: entry.name,
              value: entry.name,
            })) || [],
          onState: (state) => {
            if (state.aborted) {
              process.nextTick(() => {
                process.exit(0)
              })
            }
          },
          min: 1,
        })
        return response.components
      },
    ),
    fetchComponentTreeSrc: fromPromise(
      async ({
        input,
      }: {
        input: {
          library: string
          selectedComponents: string[]
        }
      }) => {
        const libraryIndex = await getComponentLibraryIndex(input.library)
        const itemsSet = new Set<string>()

        const treeSet = new Set(
          libraryIndex.resources.filter((item) =>
            input.selectedComponents?.includes(item.name),
          ),
        )

        treeSet.forEach((item) => {
          itemsSet.add(item.name)
          item.registryDependencies.forEach((dep: string) => {
            itemsSet.add(dep)
          })
        })

        // TODO: also remove ones already installed
        const treeSetItemsThatAreNotSelected = Array.from(itemsSet).filter(
          (item) => !input.selectedComponents?.includes(item),
        )

        if (treeSetItemsThatAreNotSelected.length > 0) {
          logger.info(
            `The selected components depend on these other components:`,
          )
          treeSetItemsThatAreNotSelected.forEach((item) => {
            logger.info(`- ${item}`)
          })
        }

        const config = await getConfig()
        invariant(config, "Config not found")

        const { registryUrl, itemUrl } = resolveLibraryUrls(
          config,
          input.library,
        )
        invariant(registryUrl, "Registry URL not found")

        const payload = await fetchTree(
          Array.from(itemsSet).map(
            (item) => `${itemUrl?.replace("{name}", item)}`,
          ),
        )

        console.log("payload", payload)

        if (!payload.length)
          throw new Error("Selected components not found. Exiting.")
        return payload
      },
    ),

    confirmInstallationSrc: fromPromise(
      async ({
        input,
      }: {
        input: { library: string; payloadLength: number }
      }) => {
        const confirmInstall = await confirmOrQuit(
          `Ready to install ${input.payloadLength} components from ${input.library}. Proceed?`,
        )
        return confirmInstall
      },
    ),
    resolveTransformersSrc: fromPromise(
      async ({ input }: { input: { library: string } }) => {
        const config = await getConfig()
        if (!config) return []

        const libConfig = resolveLibraryConfig(config, input.library)

        return libConfig?.transformers
          ? await resolveTransformers(libConfig.transformers)
          : []
      },
    ),
    installComponentsSrc,
    postInstallStepsSrc: fromPromise(
      async ({ input }: { input: { library: string } }) => {
        const config = await getConfig()
        if (!config) return

        const libConfig = resolveLibraryConfig(config, input.library)
        if (libConfig?.postinstall && libConfig.postinstall.length > 0) {
          const cmd =
            typeof libConfig.postinstall === "string"
              ? libConfig.postinstall
              : libConfig.postinstall[0]
          const args =
            typeof libConfig.postinstall === "string"
              ? []
              : libConfig.postinstall.slice(1)

          if (cmd) {
            await execa(cmd, args)
          }
        }
      },
    ),

    // Replaced setTargetDirSrc with configureLibrarySrc
    configureLibrarySrc: fromPromise(
      async ({ input }: { input: { library: string } }) => {
        const config = await getConfig()
        invariant(config, "Config not found")

        const libConfig = resolveLibraryConfig(config, input.library)
        console.log("resolving", input.library, libConfig)
        if (libConfig?.directory) {
          return libConfig
        } else {
          await initLibrary({ name: input.library })
          return config.libraries[input.library]
        }
      },
    ),
  },
  guards: {
    // If enough args are passed then we don't need a config file
    doesNotRequireConfigFile: ({ context }) => {
      const doesNotRequireConfigFile =
        Boolean(context.library) && Boolean(context.targetDir)

      return Boolean(context.config || doesNotRequireConfigFile)
    },
    // Most of the guards are negative conditions to move us backwards to the step that fulfills them
    hasSelectedZeroComponents: ({ context }) => {
      console.log("hasSelectedZeroComponents", context.selectedComponents)
      return !context.selectedComponents?.length
    },
    hasNoConfig: ({ context }) => !context.config,
    hasNoLibrary: ({ context }) => !context.library,
    hasLibrarySet: ({ context }) => Boolean(context.library),
    hasNoLibraries: ({ context }) =>
      Object.keys(context.config?.libraries || {}).length === 0,
    eventHasNoOutput: ({ event }) => !("output" in event) || !event.output,
    eventIsConfigureLibraries: ({ event }) =>
      event.output.includes("Configure libraries ->"),
    hasNoTargetDir: ({ context }) => !context.targetDir, // Added guard
    // short circuit to end the machine if there's an error
    hasError: ({ context }) => Boolean(context.error),
  },
}).createMachine({
  context: ({ input }) => {
    // TODO: infer package manager filesystem
    const packageManager = input.packageManager || "npm"

    return {
      // we can set config here to tell the machine we have one
      // but always read it from setConfig instead of passing as input
      config: undefined,
      payload: [],
      library: input.libArg,
      targetDir: input.targetDir,
      transformers: [],
      selectedComponents: input.itemsArg || [],
      packageManager: "npm",
      error: undefined,
    }
  },
  // use this container state so we can bail on any error
  initial: "running",
  states: {
    error: {
      type: "final",
      entry: "exitWithError",
    },
    running: {
      always: {
        target: "error",
        guard: "hasError",
      },
      initial: "loadConfiguration",
      states: {
        loadConfiguration: {
          always: [
            {
              // fetchComponentTree is as far as we can start with CLI flags instead of config file
              target: "fetchComponentTree",
              // if we have a library and a target dir, we can skip the configuration step
              guard: "doesNotRequireConfigFile",
            },
          ],
          invoke: {
            id: "loadConfiguration",
            src: "loadConfigurationSrc",
            onDone: [
              {
                guard: "eventHasNoOutput",
                target: "configureLibraries",
              },
              {
                reenter: true,
                actions: assign({
                  config: ({ event }) => {
                    return event.output!
                  },
                }),
              },
            ],
            onError: {
              target: "configureLibraries",
            },
          },
        },

        configureLibraries: {
          invoke: {
            src: "configureLibrariesSrc",
            onDone: {
              target: "loadConfiguration",
              actions: assign({
                config: ({ event }) => {
                  return event.output!
                },
              }),
            },
            onError: {
              actions: "setError",
            },
          },
        },

        chooseLibrary: {
          always: [
            {
              // we need config to invoke chooseLibrarySrc
              target: "configureLibraries",
              guard: "hasNoConfig",
            },
            {
              // if we already have a lib, move forward to selectComponents
              target: "selectComponents",
              guard: "hasLibrarySet",
            },
          ],
          invoke: {
            src: "chooseLibrarySrc",
            input: ({ context }) => ({ config: context.config }),
            onDone: [
              {
                guard: "eventIsConfigureLibraries",
                target: "configureLibraries",
              },
              {
                reenter: true,
                actions: assign({
                  library: ({ event }) => {
                    return event.output
                  },
                }),
              },
            ],
            onError: {
              actions: "setError",
            },
          },
        },
        selectComponents: {
          always: [
            {
              // we need a lib to invoke selectComponentsSrc
              target: "chooseLibrary",
              guard: "hasNoLibrary",
            },
          ],
          invoke: {
            src: "selectComponentsSrc",
            input: ({ context }) => ({
              library: context.library!,
              config: context.config!,
            }),
            onDone: {
              target: "fetchComponentTree",
              actions: assign({
                selectedComponents: ({ event }) => event.output,
              }),
            },
            onError: {
              actions: "setError",
            },
          },
        },
        exit: {
          type: "final",
          entry: "exitGracefully",
        },
        fetchComponentTree: {
          always: [
            {
              target: "selectComponents",
              guard: "hasSelectedZeroComponents",
            },
            {
              target: "chooseLibrary",
              guard: "hasNoLibrary",
            },
            {
              target: "configureLibrary",
              guard: "hasNoTargetDir",
            },
          ],
          invoke: {
            src: "fetchComponentTreeSrc",
            input: ({ context }) => ({
              selectedComponents: context.selectedComponents!,
              library: context.library!,
            }),
            onDone: {
              target: "confirmInstallation",
              actions: assign({
                payload: ({ event }) => event.output,
              }),
            },
            onError: {
              actions: "setError",
            },
          },
        },

        configureLibrary: {
          // New state replacing setTargetDir
          invoke: {
            src: "configureLibrarySrc",
            input: ({ context }) => ({
              library: context.library!,
            }),
            onDone: {
              target: "fetchComponentTree",
              actions: assign({
                targetDir: ({ context, event }) =>
                  context.targetDir || event.output?.directory,
              }),
            },
            onError: {
              actions: "setError",
            },
          },
        },

        confirmInstallation: {
          invoke: {
            src: "confirmInstallationSrc",
            input: ({ context }) => ({
              library: context.library!,
              payloadLength: context.payload?.length || 0,
            }),
            onDone: [
              {
                target: "resolveTransformers",
              },
            ],
            onError: {
              actions: "setError",
            },
          },
        },
        resolveTransformers: {
          invoke: {
            src: "resolveTransformersSrc",
            input: ({ context }) => ({
              library: context.library!,
            }),
            onDone: {
              target: "installComponents",
              actions: assign({
                transformers: ({ event }) => event.output,
              }),
            },
            onError: {
              actions: "setError",
            },
          },
        },
        installComponents: {
          invoke: {
            src: "installComponentsSrc",
            input: ({ context }) => ({
              payload: context.payload!,
              transformers: context.transformers!,
              targetDir: context.targetDir!,
              selectedComponents: context.selectedComponents || [],
              library: context.library!,
              packageManager: context.packageManager,
            }),
            onDone: {
              target: "postInstallSteps",
            },
            onError: {
              actions: "setError",
            },
          },
        },
        postInstallSteps: {
          invoke: {
            src: "postInstallStepsSrc",
            input: ({ context }) => ({
              library: context.library!,
            }),
            onDone: {
              target: "exit",
            },
            onError: {
              actions: "setError",
            },
          },
        },
      },
    },
  },
})

async function getComponentLibraryIndex(library: string) {
  // resolve the library config
  // if it has a url, use that, otherwise use the default
  // then use the library index from the registry
  const config = await getConfig()
  invariant(config, "Config not found")

  const { registryUrl } = resolveLibraryUrls(config, library)
  if (!registryUrl) {
    throw new Error(`Library ${library} not found`)
  }

  const resources = await fetch(registryUrl, {
    headers: {
      "Content-Type": "application/json",
    },
  }).then((res) => res.json())

  return {
    name: library,
    resources: z.array(libraryItemSchema).parse(resources),
  }
}

export async function addComponentsFromLibrary({
  items,
  library,
  logger = console.info,
}: {
  items: string[]
  library: string
  logger?: (message: string) => void
}) {
  const config = await getConfig()
  invariant(config, "Config not found")

  // Get the library index
  const libraryIndex = await getComponentLibraryIndex(library)
  const itemsSet = new Set<string>()

  // Collect selected items and their dependencies
  libraryIndex.resources.forEach((item) => {
    if (items.includes(item.name)) {
      itemsSet.add(item.name)
      item.registryDependencies.forEach((dep: string) => {
        itemsSet.add(dep)
      })
    }
  })

  // Resolve library URLs
  const { registryUrl, itemUrl } = resolveLibraryUrls(config, library)
  invariant(registryUrl, "Registry URL not found")

  // Fetch component data
  const payload = await fetchTree(
    Array.from(itemsSet).map((item) => `${itemUrl?.replace("{name}", item)}`),
  )

  if (!payload.length) {
    throw new Error("Selected items not found.")
  }

  // Resolve transformers
  const libConfig = resolveLibraryConfig(config, library)
  const transformers = libConfig?.transformers
    ? await resolveTransformers(libConfig.transformers)
    : []

  logger(`Resolving ${transformers.length} transformers`)

  // Install items
  await installComponents({
    payload,
    transformers,
    targetDir: libConfig?.directory || "",
    selectedComponents: items,
    library,
  })

  // Run post-install steps
  if (libConfig?.postinstall?.length) {
    const cmd =
      typeof libConfig.postinstall === "string"
        ? libConfig.postinstall
        : libConfig.postinstall[0]
    const args =
      typeof libConfig.postinstall === "string"
        ? []
        : libConfig.postinstall.slice(1)

    if (cmd) {
      await execa(cmd, args)
    }
  }

  return payload
}
