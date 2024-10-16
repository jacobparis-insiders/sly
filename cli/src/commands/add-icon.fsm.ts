import { assign, fromPromise, setup } from "xstate"
import { Config, getConfig, LibraryConfig } from "~/src/get-config.js"
import { logger } from "~/src/logger.js"
import { fetchTree, getLibraryIndex } from "~/src/registry.js"
import { execa } from "execa"
import ora from "ora"
import prompts from "prompts"
import * as z from "zod"
import { resolveTransformers } from "~/src/transformers.js"
import { chooseLibrary, configureLibraries, initLibrary } from "./library.js"
import { confirmOrQuit, confirm } from "../prompts.js"
import { existsSync } from "fs"
import fs from "fs/promises"
import path from "path"

import type { Transformer } from "~/src/index.js"
import { invariant } from "@epic-web/invariant"
import { libraryItemWithContentSchema } from "site/app/schemas.js"

type Component = z.infer<typeof libraryItemWithContentSchema>
export const addIconMachine = setup({
  types: {
    input: {} as {
      libArg?: string
      iconsArg?: string[]
      targetDir?: string
    },
    context: {} as {
      config: Config | undefined
      payload: Component[]
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
      await configureLibraries()
    }),
    chooseLibrarySrc: fromPromise(
      async ({ input }: { input: { config: Config | undefined } }) => {
        invariant(input.config, "Configuration not found")

        const config = input.config
        const libraries = [
          ...config.libraries,
          { name: "\n    Configure libraries ->" },
        ]
        const choice = await chooseLibrary(libraries)
        return choice
      },
    ),

    selectIconsSrc: fromPromise(
      async ({
        input,
      }: {
        input: {
          library: string
        }
      }) => {
        const libraryIndex = await getLibraryIndex(input.library)

        const response = await prompts({
          type: "autocompleteMultiselect",
          name: "icons",
          message: "Which items would you like to add?",
          hint: "Space to select. A to toggle all. Enter to submit.",
          instructions: false,
          choices: libraryIndex.resources.map((entry) => ({
            title: entry.name,
            value: entry.name,
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
        const libraryIndex = await getLibraryIndex(input.library)
        const treeSet = new Set(
          libraryIndex.resources.filter(
            (item) => input.selectedIcons?.includes(item.name),
          ),
        )
        treeSet.forEach((item) => {
          if (item.dependencies.length > 0) {
            item.dependencies.forEach((dep: string) => {
              const dependency = libraryIndex.resources.find(
                (res) => res.name === dep,
              )
              if (dependency) {
                treeSet.add(dependency)
              } else {
                logger.error(`Dependency ${dep} not found in registry`)
              }
            })
          }
        })
        const treeSetItemsThatAreNotSelected = Array.from(treeSet).filter(
          (item) => !input.selectedIcons?.includes(item.name),
        )

        if (treeSetItemsThatAreNotSelected.length > 0) {
          logger.info(`The selected icons depend on these other icons:`)
          treeSetItemsThatAreNotSelected.forEach((item) => {
            logger.info(`- ${item.name}`)
          })
        }

        const payload = await fetchTree(input.library, Array.from(treeSet))
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
      async ({ input }: { input: { config?: Config; library: string } }) => {
        const libConfig = input.config?.libraries.find(
          (lib) => lib.name === input.library,
        )

        return libConfig
          ? await resolveTransformers(libConfig.transformers)
          : []
      },
    ),
    installIconsSrc: fromPromise(
      async ({
        input,
      }: {
        input: {
          payload: Component[]
          transformers: Array<{ default: Transformer }>
          targetDir: string
          selectedIcons: string[]
          config: Config
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
            if (input.selectedIcons?.includes(icon.name)) {
              logger.warn(
                `Component ${icon.name} already exists. Use --overwrite to overwrite.`,
              )
              process.exit(1)
            }
            continue
          }

          if (icon.dependencies.length || icon.devDependencies.length) {
            const shouldInstall = await confirm(
              [
                `${icon.name} requires the following`,
                icon.dependencies.length ? "\nDependencies:" : "",
                ...icon.dependencies.map((dep: string) => `- ${dep}`),
                icon.devDependencies.length ? "\nDev Dependencies:" : "",
                ...icon.devDependencies.map((dep: string) => `\n- ${dep}`),
                "\nProceed?",
              ]
                .filter(Boolean)
                .join("\n"),
            )

            if (shouldInstall) {
              if (icon.dependencies?.length) {
                await execa("npm", ["install", ...icon.dependencies])
              }

              if (icon.devDependencies?.length) {
                await execa("npm", [
                  "install",
                  "--save-dev",
                  ...icon.devDependencies,
                ])
              }
            }
          }

          const iconSpinner = ora(`  Installing ${icon.name}...\n`).start()

          for (const file of icon.files) {
            const fileSpinner = ora(`    Installing ${file.name}...\n`).start()

            const output = await input.transformers.reduce(
              async (content, transformer) =>
                transformer.default(await content, icon.meta),
              Promise.resolve(file.content),
            )

            await fs.writeFile(path.resolve(input.targetDir, file.name), output)

            fileSpinner.succeed(
              `    Installed ${path.join(input.targetDir, file.name)}`,
            )
          }
          iconSpinner.succeed(`  Installed ${icon.name}`)
        }
      },
    ),
    postInstallStepsSrc: fromPromise(
      async ({ input }: { input: { libConfig?: LibraryConfig } }) => {
        const libConfig = input.libConfig
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
      async ({ input }: { input: { library: string; config: Config } }) => {
        const libConfig = input.config.libraries.find(
          (lib) => lib.name === input.library,
        )
        if (libConfig?.directory) {
          return libConfig
        } else {
          await initLibrary(input.library)
          const config = await getConfig()
          return config?.libraries.find((lib) => lib.name === input.library)
        }
      },
    ),
  },
  guards: {
    // If enough args are passed then we don't need a config file
    doesNotRequireConfigFile: ({ context }) => {
      const doesNotRequireConfigFile =
        Boolean(context.library) && Boolean(context.targetDir)

      return doesNotRequireConfigFile
    },
    // Most of the guards are negative conditions to move us backwards to the step that fulfills them
    hasSelectedZeroIcons: ({ context }) => !context.selectedIcons?.length,
    hasNoConfig: ({ context }) => !context.config,
    hasNoLibrary: ({ context }) => !context.library,
    hasLibrarySet: ({ context }) => Boolean(context.library),
    hasNoLibraries: ({ context }) => context.config?.libraries.length === 0,
    eventHasNoOutput: ({ event }) => !("output" in event) || !event.output,
    hasNoTargetDir: ({ context }) => !context.targetDir, // Added guard
    // short circuit to end the machine if there's an error
    hasError: ({ context }) => Boolean(context.error),
  },
}).createMachine({
  context: ({ input }) => {
    return {
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
                  config: ({ event }) => event.output!,
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
            onDone: {
              reenter: true,
              actions: assign({
                library: ({ event }) => {
                  return event.output
                },
              }),
            },
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
              config: context.config!,
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
              config: context.config!,
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
              config: context.config!,
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
              libConfig: context.config?.libraries.find(
                (lib) => lib.name === context.library,
              ),
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
