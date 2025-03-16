import { assign, fromPromise, setup } from "xstate"
import { Config, getConfig, resolveLibraryConfig } from "~/src/get-config.js"
import { logger } from "~/src/logger.js"
import { execa } from "execa"
import prompts from "prompts"
import { resolveTransformers } from "~/src/transformers.js"
import {
  chooseLibrary,
  configureIconLibraries,
  initLibrary,
} from "./library.js"
import { confirmOrQuit } from "../prompts.js"
import { existsSync } from "fs"
import fs from "fs/promises"
import path from "path"

import type { Transformer } from "~/src/index.js"
import { invariant } from "@epic-web/invariant"
import { fetchIcons, getIconifyLibraryIndex } from "../iconify.js"
import { installFile } from "../install.js"
import { createChooseLibrarySrc } from "../actors/choose-library-src.js"

export const addIconMachine = setup({
  types: {
    input: {} as {
      libArg?: string
      iconsArg?: string[]
      targetDir?: string
    },
    context: {} as {
      config: Config | undefined
      payload: Array<{
        name: string
        files: Array<{
          type: "file"
          name: string
          content: string
        }>
      }>
      library: string | undefined
      targetDir: string | undefined
      transformers: Array<{ default: Transformer }>
      selectedIcons: string[]
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
      await configureIconLibraries()
      const config = await getConfig()
      return config
    }),
    chooseLibrarySrc: createChooseLibrarySrc({
      extraItems: [{ name: `\n    Configure icon libraries ->` }],
      filter: (config) => {
        if (config.name.includes("iconify")) {
          return true
        }

        return false
      },
    }),

    selectIconsSrc: fromPromise(
      async ({
        input,
      }: {
        input: {
          library: string
        }
      }) => {
        // we could get a list of categories from the registry
        // or uncategorized icons
        const libraryIndex = await getIconifyLibraryIndex(input.library)

        let icons: Array<string> = libraryIndex.uncategorized || []
        if (libraryIndex.categories) {
          const category = await prompts({
            type: "select",
            name: "category",
            message: "Select a category",
            choices: Object.keys(libraryIndex.categories).map((name) => ({
              title: name,
              value: name,
            })),
            onState: (state) => {
              if (state.aborted) {
                process.nextTick(() => {
                  process.exit(0)
                })
              }
            },
          })

          icons = libraryIndex.categories[category.category] || []
        }

        const response = await prompts({
          type: "autocompleteMultiselect",
          name: "icons",
          message: "Which items would you like to add?",
          hint: "Space to select. A to toggle all. Enter to submit.",
          instructions: false,
          choices: icons.map((item) => ({
            title: item,
            value: item,
          })),
          onState: (state) => {
            if (state.aborted) {
              process.nextTick(() => {
                process.exit(0)
              })
            }
          },
          min: 1,
        })

        return response.icons
      },
    ),
    fetchIconTreeSrc: fromPromise(
      async ({
        input,
      }: {
        input: {
          library: string
          selectedIcons: string[]
        }
      }) => {
        const payload = await fetchIcons(input.library, input.selectedIcons)
        if (!payload.length)
          throw new Error("Selected icons not found. Exiting.")
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
          `Ready to install ${input.payloadLength} icons from ${input.library}. Proceed?`,
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
    installIconsSrc: fromPromise(
      async ({
        input,
      }: {
        input: {
          payload: Array<{
            name: string
            files: Array<{
              type: "file"
              name: string
              content: string
            }>
          }>
          transformers: Array<{ default: Transformer }>
          targetDir: string
          selectedIcons: string[]
          library: string
        }
      }) => {
        for (const icon of input.payload) {
          if (!existsSync(input.targetDir)) {
            await fs.mkdir(input.targetDir, { recursive: true })
          }

          const existingIcon = icon.files.filter((file) =>
            existsSync(path.resolve(input.targetDir, file.name)),
          )

          if (existingIcon.length && !process.env.OVERWRITE) {
            logger.warn(
              `Component ${icon.name} already exists. Use --overwrite to overwrite.`,
            )
            process.exit(1)
          }

          for (const file of icon.files) {
            await installFile(file, { targetDir: input.targetDir })
          }
        }
      },
    ),
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
        if (libConfig?.directory) {
          return libConfig
        } else {
          console.log(
            "Could not resolve library config, initializing",
            input.library,
          )
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
    hasSelectedZeroIcons: ({ context }) => !context.selectedIcons?.length,
    hasNoConfig: ({ context }) => !context.config,
    hasNoLibrary: ({ context }) => !context.library,
    hasLibrarySet: ({ context }) => Boolean(context.library),
    hasNoLibraries: ({ context }) =>
      Object.keys(context.config?.libraries || {}).length === 0,
    eventHasNoOutput: ({ event }) => !("output" in event) || !event.output,
    eventIsConfigureLibraries: ({ event }) => event.output.includes("->"),
    hasNoTargetDir: ({ context }) => !context.targetDir, // Added guard
    // short circuit to end the machine if there's an error
    hasError: ({ context }) => Boolean(context.error),
  },
}).createMachine({
  context: ({ input }) => {
    return {
      // we can set config here to tell the machine we have one
      // but always read it from setConfig instead of passing as input
      config: undefined,
      payload: [],
      library: input.libArg,
      targetDir: input.targetDir,
      transformers: [],
      selectedIcons: input.iconsArg || [],
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
              // fetchIconTree is as far as we can start with CLI flags instead of config file
              target: "fetchIconTree",
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
              // if we already have a lib, move forward to selectIcons
              target: "selectIcons",
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
        selectIcons: {
          always: [
            {
              // we need a lib to invoke selectIconsSrc
              target: "chooseLibrary",
              guard: "hasNoLibrary",
            },
          ],
          invoke: {
            src: "selectIconsSrc",
            input: ({ context }) => ({
              library: context.library!,
            }),
            onDone: {
              target: "fetchIconTree",
              actions: assign({
                selectedIcons: ({ event }) => event.output,
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
        fetchIconTree: {
          always: [
            {
              target: "selectIcons",
              guard: "hasSelectedZeroIcons",
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
            src: "fetchIconTreeSrc",
            input: ({ context }) => ({
              selectedIcons: context.selectedIcons!,
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
              target: "fetchIconTree",
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
              target: "installIcons",
              actions: assign({
                transformers: ({ event }) => event.output,
              }),
            },
            onError: {
              actions: "setError",
            },
          },
        },
        installIcons: {
          invoke: {
            src: "installIconsSrc",
            input: ({ context }) => ({
              payload: context.payload!,
              transformers: context.transformers!,
              targetDir: context.targetDir!,
              selectedIcons: context.selectedIcons || [],
              library: context.library!,
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
