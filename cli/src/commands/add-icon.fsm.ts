import { assign, fromPromise, setup } from "xstate"
import { Config, getConfig } from "~/src/get-config.js"
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

interface IconFile {
  name: string
  content: string
}

interface Icon {
  name: string
  files: IconFile[]
  dependencies: string[]
  devDependencies: string[]
  meta: Meta
}

type TreeSet = z.infer<typeof libraryIndexSchema>["resources"]

import type { Meta, Transformer } from "~/src/index.js"
import { invariant } from "@epic-web/invariant"
import { libraryIndexSchema } from "site/app/schemas.js"

interface AddIconContext {
  libArg?: string
  iconsArg?: string[]
  library?: string
  icons?: string[]
  config?: Config
  selectedIcons?: string[]
  treeSet?: TreeSet
  payload?: Icon[]
  libConfig?: LibraryConfig
  transformers?: Array<{ default: Transformer }>
  targetDir?: string
  error?: string
}

interface LibraryConfig {
  name: string
  directory: string
  transformers: string[]
  postinstall?: string | string[]
}

type AddIconEvent =
  | { type: "START" }
  | { type: "LIBRARY_PROVIDED"; library: string }
  | { type: "LOAD_CONFIG_SUCCESS"; config: Config }
  | { type: "LOAD_CONFIG_FAILURE" }
  | { type: "CONFIGURE_LIBRARIES" }
  | { type: "LIBRARY_CHOSEN"; library: string }
  | { type: "LIBRARY_VALID"; library: string }
  | { type: "LIBRARY_INVALID"; error: string }
  | { type: "INITIALIZE_LIBRARY"; library: string }
  | {
      type: "GET_LIBRARY_INDEX_SUCCESS"
      index: ReturnType<typeof getLibraryIndex>
    }
  | { type: "GET_LIBRARY_INDEX_FAILURE"; error: string }
  | { type: "SELECT_ICONS"; icons: string[] }
  | { type: "PROCESS_DEPENDENCIES" }
  | { type: "NOTIFY_DEPENDENCIES" }
  | { type: "FETCH_ICON_TREE_SUCCESS"; payload: Icon[] }
  | { type: "FETCH_ICON_TREE_FAILURE"; warning: string }
  | { type: "CONFIRM_INSTALLATION"; confirm: boolean }
  | { type: "RESOLVE_TRANSFORMERS_SUCCESS"; transformers: Transformer[] }
  | { type: "INSTALL_ICONS" }
  | { type: "POST_INSTALL_STEPS" }
  | { type: "COMPLETE" }
  | { type: "FAILURE"; error: string }

export const addIconMachine = setup({
  types: {
    input: {} as {
      libArg?: string
      iconsArg?: string[]
      targetDir?: string
    },
    context: {} as AddIconContext,
    events: {} as AddIconEvent,
  },
  actions: {
    logErrorAndExit: ({ context }) => {
      logger.error(context.error)
      process.exit(1)
    },
    exitProcess: () => {
      process.exit(0)
    },
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
          payload: Icon[]
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
    hasSufficientContext: ({ context }) => {
      const hasSufficientContext =
        Boolean(context.library) && Boolean(context.targetDir)

      return hasSufficientContext
    },
    hasSelectedZeroIcons: ({ context }) => !context.selectedIcons?.length,
    hasNoConfig: ({ context }) => !context.config,
    hasNoLibrary: ({ context }) => !context.library,
    hasLibraries: ({ context }) => Boolean(context.config?.libraries.length),
    hasLibrarySet: ({ context }) => Boolean(context.library),
    hasConfig: ({ context }) => Boolean(context.config),
    hasNoLibraries: ({ context }) => context.config?.libraries.length === 0,
    isConfigureLibraries: ({ event }) =>
      event.type === "LIBRARY_CHOSEN" &&
      event.library === "\n    Configure libraries ->",
    isConfirmed: ({ event }) =>
      event.type === "CONFIRM_INSTALLATION" && event.confirm === true,
    eventHasNoOutput: ({ event }) => !("output" in event) || !event.output,
    hasNoTargetDir: ({ context }) => !context.targetDir, // Added guard
  },
}).createMachine({
  context: ({ input }) => {
    return {
      config: undefined,
      payload: [],
      library: input.libArg,
      targetDir: input.targetDir,
      transformers: [],
      selectedIcons: input.iconsArg,
      error: undefined,
    }
  },
  initial: "loadConfiguration",
  states: {
    loadConfiguration: {
      always: [
        {
          target: "fetchIconTree",
          // if we have a library and a target dir, we can skip the configuration step
          guard: "hasSufficientContext",
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

    failure: {
      type: "final",
      entry: {
        type: "logErrorAndExit",
      },
    },
    configureLibraries: {
      invoke: {
        src: "configureLibrariesSrc",
        onDone: {
          target: "loadConfiguration",
        },
        onError: {
          target: "failure",
          actions: assign({
            error: ({ event }) => event.error as string,
          }),
        },
      },
    },

    chooseLibrary: {
      always: [
        {
          target: "configureLibraries",
          guard: "hasNoConfig",
        },
        {
          target: "selectIcons",
          guard: "hasLibrarySet",
        },
      ],
      invoke: {
        src: "chooseLibrarySrc",
        input: ({ context }) => ({ config: context.config }),
        onDone: [
          {
            target: "configureLibraries",
            guard: "hasNoLibraries",
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
          target: "failure",
          actions: assign({
            error: ({ event }) => event.error as string,
          }),
        },
      },
    },
    selectIcons: {
      always: [
        {
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
          target: "exit",
        },
      },
    },
    exit: {
      type: "final",
      entry: {
        type: "exitProcess",
      },
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
          target: "configureLibrary", // Updated transition
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
          target: "exit",
          actions: assign({
            error: ({ event }) => event.error as string,
          }),
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
          target: "failure",
          actions: assign({
            error: ({ event }) => event.error as string,
          }),
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
          target: "exit",
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
          target: "failure",
          actions: assign({
            error: ({ event }) => event.error as string,
          }),
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
          target: "failure",
          actions: assign({
            error: ({ event }) => event.error as string,
          }),
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
          target: "complete",
        },
        onError: {
          target: "failure",
          actions: assign({
            error: ({ event }) => event.error as string,
          }),
        },
      },
    },
    complete: {
      type: "final",
      entry: {
        type: "exitProcess",
      },
    },
  },
})
