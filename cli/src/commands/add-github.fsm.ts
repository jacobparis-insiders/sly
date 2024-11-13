import { assign, fromPromise, setup } from "xstate"
import {
  Config,
  getConfig,
  resolveLibraryConfig,
  resolveLibraryUrls,
} from "~/src/get-config.js"
import { logger } from "~/src/logger.js"
import { execa } from "execa"
import ora from "ora"
import prompts from "prompts"
import * as z from "zod"
import { resolveTransformers } from "~/src/transformers.js"
import {
  chooseLibrary,
  configureComponentLibraries,
  initLibrary,
} from "./library.js"
import { confirmOrQuit } from "../prompts.js"
import { existsSync } from "fs"
import fs from "fs/promises"
import path from "path"

import type { Transformer } from "~/src/index.js"
import { invariant } from "@epic-web/invariant"
import { libraryItemWithContentSchema } from "site/app/schemas.js"
import jsonata from "jsonata"
import { Octokit } from "@octokit/rest"
import { installComponentsSrc } from "../actors/install-components-src.js"

type Component = z.infer<typeof libraryItemWithContentSchema>

type ComponentFile = Component["files"][number]

type ApplyOptions = {
  targetDir: string
}

async function applyNewFile(file: ComponentFile, options: ApplyOptions) {
  const targetFile = path.resolve(options.targetDir, file.name)
  const spinner = ora(`  Installing ${file.name}...\n`).start()
  await fs.writeFile(targetFile, file.content)
  spinner.succeed(`  Installed ${targetFile.replace(process.cwd(), "")}`)
}

async function applyJsonata(file: ComponentFile, options: ApplyOptions) {
  const targetFile = path.resolve(options.targetDir, file.name)
  const spinner = ora(`  Modifying ${file.name}...\n`).start()
  const input = await fs.readFile(targetFile.replace(process.cwd(), ""))
  const output = await jsonata(file.content).evaluate(input)
  await fs.writeFile(targetFile, output)
  spinner.succeed(`  Modified ${targetFile.replace(process.cwd(), "")}`)
}

function installFile(file: ComponentFile, options: ApplyOptions) {
  switch (file.type) {
    case "file":
      return applyNewFile(file, options)
    case "jsonata":
      return applyJsonata(file, options)
    default:
      throw new Error(`Unknown file type: ${file}`)
  }
}

export const addGitHubMachine = setup({
  types: {
    input: {} as {
      libArg?: string
      componentArg?: string[]
      targetDir?: string
    },
    context: {} as {
      config: Config | undefined
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
    chooseLibrarySrc: fromPromise(
      async ({ input }: { input: { config: Config | undefined } }) => {
        invariant(input.config, "Configuration not found")

        const config = input.config
        const libraries = [
          ...Object.keys(config.libraries).map((name) => ({ name })),
          { name: "\n    Configure libraries ->" },
        ]
        const choice = await chooseLibrary(libraries)
        return choice
      },
    ),

    selectComponentrc: fromPromise(
      async ({
        input,
      }: {
        input: {
          library: string
          config: Config
        }
      }) => {
        const libraryIndex = await getGithubDirectoryIndex(input.library)

        const response = await prompts({
          type: "autocomplete",
          name: "component",
          message: "Which item would you like to add?",
          hint: "Enter to select",
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
        })

        return response.component
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
        const libraryIndex = await getGithubDirectoryIndex(input.library)
        const treeSet = new Set(
          libraryIndex.resources.filter((item) =>
            input.selectedComponents.includes(item.name),
          ),
        )

        const config = await getConfig()
        invariant(config, "Config not found")

        const { registryUrl } = resolveLibraryUrls(config, input.library)
        invariant(registryUrl, "Registry URL not found")

        const payload = await fetchGitHubTree(
          Array.from(treeSet).map((item) => `${registryUrl}/${item.name}`),
        )

        if (!payload.length)
          throw new Error("Selected component not found. Exiting.")
        return z.array(libraryItemWithContentSchema).parse(payload)
      },
    ),

    confirmInstallationSrc: fromPromise(
      async ({
        input,
      }: {
        input: { library: string; payloadLength: number }
      }) => {
        const confirmInstall = await confirmOrQuit(
          `Ready to install ${input.payloadLength} component from ${input.library}. Proceed?`,
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
    hasSelectedZeroComponent: ({ context }) =>
      !context.selectedComponents?.length,
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
    return {
      // we can set config here to tell the machine we have one
      // but always read it from setConfig instead of passing as input
      config: undefined,
      payload: [],
      library: input.libArg,
      targetDir: input.targetDir,
      transformers: [],
      selectedComponents: input.componentArg || [],
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
              // if we already have a lib, move forward to selectComponent
              target: "selectComponent",
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
        selectComponent: {
          always: [
            {
              target: "chooseLibrary",
              guard: "hasNoLibrary",
            },
          ],
          invoke: {
            src: "selectComponentrc",
            input: ({ context }) => ({
              library: context.library!,
              config: context.config!,
            }),
            onDone: {
              target: "fetchComponentTree",
              actions: assign({
                selectedComponents: ({ event }) => [event.output],
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
              target: "selectComponent",
              guard: "hasSelectedZeroComponent",
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
              target: "installComponent",
              actions: assign({
                transformers: ({ event }) => event.output,
              }),
            },
            onError: {
              actions: "setError",
            },
          },
        },
        installComponent: {
          invoke: {
            src: "installComponentsSrc",
            input: ({ context }) => ({
              payload: context.payload!,
              transformers: context.transformers!,
              targetDir: context.targetDir!,
              selectedComponents: context.selectedComponents || [],
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

async function getGithubDirectoryIndex(library: string) {
  const config = await getConfig()
  invariant(config, "Config not found")

  const registryUrl = resolveLibraryUrls(config, library).registryUrl
  invariant(registryUrl, "Registry URL not found")
  const octokit = new Octokit()

  const url = new URL(registryUrl)
  const owner = url.pathname.split("/")[1]
  const repo = url.pathname.split("/")[2]
  const path = url.pathname
    .split("/")
    .slice(3)
    .join("/")
    .replace("tree/main", "")

  if (!owner || !repo) {
    throw new Error(
      'Invalid GitHub repository format. Expected "owner/repo" or "owner/repo/path"',
    )
  }

  const { data } = await octokit.repos.getContent({
    owner,
    repo,
    path: path || "",
  })

  // Transform GitHub API response to match expected format
  const resources = Array.isArray(data)
    ? data.map((item) => ({
        name: item.name,
      }))
    : []

  return {
    name: library,
    resources,
  }
}

async function fetchGitHubTree(paths: string[]) {
  const config = await getConfig()
  invariant(config, "Config not found")
  const octokit = new Octokit()

  const files = await Promise.all(
    paths.map(async (path) => {
      const { data } = await octokit.repos.getContent(
        parseGitHubURLForOctokit(path),
      )

      const dataArray = Array.isArray(data) ? data : [data]

      return dataArray.map((data) => {
        if (data.type !== "file") {
          throw new Error("Expected file, got " + data.type, { cause: data })
        }

        if (!data.content) {
          throw new Error("File content not found", { cause: data })
        }

        return {
          name: data.name,
          files: [
            {
              name: data.name,
              content: Buffer.from(data.content, "base64").toString("utf-8"),
            },
          ],
        }
      })
    }),
  )

  // Flatten the results after all promises are resolved
  return files.flat()
}

function parseGitHubURLForOctokit(url: string) {
  const match = url.match(
    /^https:\/\/github\.com\/([^/]+)\/([^/]+)(?:\/(?:blob|tree)\/[^/]+)?(\/.*)?$/,
  )

  if (!match) {
    throw new Error("Invalid GitHub URL")
  }

  const [, owner, repo, path] = match
  invariant(owner, "Owner not found")
  invariant(repo, "Repo not found")

  return {
    owner,
    repo,
    path: path ? path.slice(1) : "", // remove leading slash if path exists
  }
}
