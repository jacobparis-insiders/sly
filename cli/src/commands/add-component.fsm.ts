import { ActorRef, assign, emit, sendTo, setup } from "xstate"
import {
  Config,
  getConfig,
  getConfigForLibrary,
  resolveLibraryConfig,
  setConfig,
} from "~/src/get-config.js"
import { logger } from "~/src/logger.js"
import { fetchTree } from "~/src/registry.js"
import { execa } from "execa"
import prompts from "prompts"
import * as z from "zod"
import { resolveTransformers } from "~/src/transformers.js"
import { configureComponentLibraries } from "./library.js"
import * as clack from "../prompts.js"

import type { Transformer } from "~/src/index.js"
import {
  libraryItemSchema,
  libraryItemWithContentSchema,
} from "site/app/schemas.js"
import { createChooseLibrarySrc } from "../actors/choose-library-src.js"
import {
  installComponents,
  installComponentsSrc,
} from "../actors/install-components-src.js"
import { fromPromise } from "../utils/from-promise.js"
import { libraryConfigSchema } from "../../../lib/schemas.js"
import chalk from "chalk"
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
      activeActor: ActorRef<any> | undefined
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
    loadConfigurationSrc: fromPromise(async ({ self }) => {
      self._parent?.send({ type: "setActiveActor", output: self })
      self._parent?.send({ type: "log", message: "Loading config..." })
      const config = await getConfig()

      if (!config) {
        self._parent?.send({
          type: "log",
          message: "No config found.",
        })
      }

      return config
    }),
    configureLibrariesSrc: fromPromise(async ({ self }) => {
      console.log("configureLibrariesSrc")
      self._parent?.send({ type: "setActiveActor", output: self })
      self._parent?.send({ type: "log", message: "Configuring libraries..." })
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
    selectComponentsSrc: fromPromise(async ({ input, self }) => {
      self._parent?.send({ type: "setActiveActor", output: self })

      self._parent?.send({ type: "log", message: "Selecting components..." })
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
    }),
    fetchComponentTreeSrc: fromPromise(async ({ input, self }) => {
      self._parent?.send({ type: "setActiveActor", output: self })

      self._parent?.send({ type: "log", message: "Fetching component tree..." })
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
        logger.info(`The selected components depend on these other components:`)
        treeSetItemsThatAreNotSelected.forEach((item) => {
          logger.info(`- ${item}`)
        })
      }

      const libConfig = await getConfigForLibrary({
        libraryId: input.library,
        requiredFields: ["itemUrl"],
      })

      const payload = await fetchTree(
        Array.from(itemsSet).map(
          (item) => `${libConfig.itemUrl?.replace("{name}", item)}`,
        ),
      )

      if (!payload.length)
        throw new Error("Selected components not found. Exiting.")
      return payload
    }),

    confirmInstallationSrc: fromPromise(async ({ input, self }) => {
      self._parent?.send({ type: "setActiveActor", output: self })

      self._parent?.send({ type: "log", message: "Confirming installation..." })
      const message = `Ready to install ${input.payload.length} components from ${input.library}. Proceed?`
      self._parent?.send({ type: "log", message })
      const confirmInstall = await Promise.race([
        clack.confirm({ message }),
        waitForEvent(self, "input"),
      ])

      // write the items to the config
      const config = await getConfig()
      if (!config) return

      // TODO: use util for mutating config
      config.libraries[input.library] ??= {}
      config.libraries[input.library].items ??= {}
      for (const item of input.payload) {
        config.libraries[input.library].items[item.name] = item
      }

      self._parent?.send({
        type: "config",
        message: await setConfig(config),
      })

      return confirmInstall
    }),
    resolveTransformersSrc: fromPromise(async ({ input, self }) => {
      self._parent?.send({ type: "log", message: "Resolving transformers..." })
      const config = await getConfig()
      if (!config) return []

      const libConfig = resolveLibraryConfig(config, input.library)

      return libConfig?.transformers
        ? await resolveTransformers(libConfig.transformers)
        : []
    }),
    installComponentsSrc,
    postInstallStepsSrc: fromPromise(async ({ input, self }) => {
      self._parent?.send({ type: "setActiveActor", output: self })

      self._parent?.send({
        type: "log",
        message: "Resolving post-install steps...",
      })

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
    }),

    // we expect to get a target dir out of this
    getLibraryTargetDirSrc: fromPromise(async ({ input, self }) => {
      self._parent?.send({ type: "setActiveActor", output: self })

      let config = await getConfig()
      if (config) {
        const libConfig = resolveLibraryConfig(config, input.library)

        if (libConfig?.directory) {
          return libConfig
        }
      }

      const abortController = new AbortController()
      self._parent?.send({
        type: "log",
        message: "Configuring library...",
      })

      const results = await Promise.race([
        waitForEvent(self, "input").then((event) => event.input),
        clack.group({
          directory: () => {
            return clack.text({
              message: `Pick a directory for ${chalk.cyan(input.library)}`,
              signal: abortController.signal,
            })
          },
          postinstall: () => {
            return clack.text({
              message: `Run a command after installing ${chalk.cyan(input.library)}?`,
              signal: abortController.signal,
            })
          },
        }),
      ])

      const answers = await z
        .object({
          directory: z.string().optional().default(""),
          postinstall: z
            .string()
            .optional()
            .default("")
            .transform((value) =>
              value.trim() ? value.trim().split(" ") : [],
            ),
        })
        .parseAsync(results)
        .catch((error) => {
          console.error(error)
          process.exit(1)
        })

      const newLibConfig = libraryConfigSchema.parse({
        config: {
          directory: answers.directory,
          postinstall: answers.postinstall,
        },
      })

      self._parent?.send({ type: "log", message: "Using config" })
      self._parent?.send({
        type: "log",
        message: JSON.stringify(newLibConfig, null, 2),
      })

      const message = `Save settings to ${chalk.cyan("pkgless.json")}?`
      self._parent?.send({ type: "log", message })

      const shouldWrite = await Promise.race([
        clack.confirm({ message }),
        waitForEvent(self, "input").then((event) => {
          console.log("event", event)
          return event.input
        }),
      ])

      self._parent?.send({
        type: "log",
        message: shouldWrite ? "yes" : "no",
      })

      if (!shouldWrite) return newLibConfig.config

      // if no config at all
      config ??= {
        config: {},
        libraries: {},
        items: [],
      }

      // if config but no library
      config.libraries[input.library] = {
        type: "component",
        config: newLibConfig.config,
      }

      self._parent?.send({
        type: "config",
        message: await setConfig(config),
      })

      return config.libraries[input.library]

      // return await initLibrary({
      //   name: input.library,
      //   remote: ({ abortController }) => {
      //     // need to listen for new events and then resolve here

      //     return promise
      //   },
      // })
    }),
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
  on: {
    log: { actions: emit(({ event }) => event) },
    config: { actions: emit(({ event }) => event) },
    setActiveActor: {
      actions: assign({
        activeActor: ({ event }) => event.output,
      }),
    },
    input: {
      actions: sendTo(
        ({ context }) => context.activeActor,
        ({ event }) => event,
      ),
    },
  },
  context: ({ input }) => {
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
      activeActor: undefined,
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
                // idea: if there's no config, send to configureLibraries
                guard: "eventHasNoOutput",
                target: "configureLibrary",
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
            actions: assign({
              activeActor: ({ self }) => {
                console.log("setting loadConfiguration actor?", self)
                return self
              },
            }),
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
            actions: assign({
              activeActor: ({ self }) => self,
            }),
          },
        },

        chooseLibrary: {
          always: [
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
            actions: assign({
              activeActor: ({ self }) => self,
            }),
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
            actions: assign({
              activeActor: ({ self }) => self,
            }),
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
            actions: assign({
              activeActor: ({ self }) => self,
            }),
          },
        },

        configureLibrary: {
          always: [
            {
              target: "chooseLibrary",
              guard: "hasNoLibrary",
            },
          ],
          invoke: {
            id: "getLibraryTargetDir",
            src: "getLibraryTargetDirSrc",
            actions: assign({
              activeActor: ({ self }) => {
                console.log("setting active actor?", self)
                return self
              },
            }),
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
              payload: context.payload,
            }),
            onDone: [
              {
                target: "resolveTransformers",
              },
            ],
            onError: {
              actions: "setError",
            },
            actions: assign({
              activeActor: ({ self }) => self,
            }),
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
            actions: assign({
              activeActor: ({ self }) => self,
            }),
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
            actions: assign({
              activeActor: ({ self }) => self,
            }),
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
            actions: assign({
              activeActor: ({ self }) => self,
            }),
          },
        },
      },
    },
  },
})

async function getComponentLibraryIndex(libraryId: string) {
  // resolve the libraryId config
  // if it has a url, use that, otherwise use the default
  // then use the libraryId index from the registry
  const libConfig = await getConfigForLibrary({
    libraryId,
    requiredFields: ["registryUrl"],
  })

  const resources = await fetch(libConfig.registryUrl, {
    headers: {
      "Content-Type": "application/json",
    },
  }).then((res) => res.json())

  return {
    name: libraryId,
    resources: z.array(libraryItemSchema).parse(resources),
  }
}

// currently only used by login
// update this to invoke the fsm and emit its events
export async function addComponentsFromLibrary({
  items,
  library,
  logger = console.info,
}: {
  items: string[]
  library: string
  logger?: (message: string) => void
}) {
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

  const libConfig = await getConfigForLibrary({
    libraryId: library,
    requiredFields: ["itemUrl", "registryUrl"],
  })

  // Fetch component data
  const payload = await fetchTree(
    Array.from(itemsSet).map(
      (item) => `${libConfig.itemUrl?.replace("{name}", item)}`,
    ),
  )

  if (!payload.length) {
    throw new Error("Selected items not found.")
  }

  const transformers = libConfig.transformers
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

function waitForEvent(
  listenable: {
    on: (event: string, listener: (event: any) => void) => void
  },
  event: string,
) {
  return new Promise((resolve) => {
    listenable.on(event, (event) => {
      resolve(event)
    })
  })
}
