import { assign, createMachine, fromPromise, setup } from "xstate"
import { addIconMachine } from "./add-icon.fsm.js"
import prompts from "prompts"
import { addComponentMachine } from "./add-component.fsm.js"
import { Config, getConfig } from "../get-config.js"
import { Octokit } from "@octokit/rest"
import { invariant } from "@epic-web/invariant"
import { installComponentsSrc } from "../actors/install-components-src.js"
import { logger } from "~/src/logger.js"
import { libraryItemWithContentSchema } from "site/app/schemas.js"
import { z } from "zod"
type Component = z.infer<typeof libraryItemWithContentSchema>

// These are the libraries that are supported in the v1 CLI
// this maps them to the iconify names so the old commands still work
const v1Libraries = {
  "tailwindlabs/heroicons": "heroicons",
  iconoir: "iconoir",
  "lucide-icons": "lucide",
  "material-design-icons": "mdi",
  "phosphor-icons": "ph",
  "@radix-ui/icons": "radix-icons",
  remixicon: "ri",
  "simple-icons": "simple-icons",
  "tabler-icons": "tabler",
}

export const addMachine = setup({
  types: {
    input: {} as {
      libArg?: string
      itemsArg?: string[]
      targetDir?: string
    },
    context: {} as {
      config?: Config | null
      libArg?: string
      itemsArg?: string[]
      targetDir?: string
      payload?: Component[]
    },
  },
  guards: {
    configNotLoaded: ({ context }) => {
      return context.config === undefined
    },
    isIconLibrary: ({ context }) => {
      const config = context.config
      const libraries = config?.libraries

      if (libraries && context.libArg && libraries[context.libArg]) {
        const lib = libraries[context.libArg]
        return lib?.type === "icon"
      }

      // TODO: ping registry
      return false
    },
    isComponentLibrary: ({ context }) => {
      const config = context.config
      const libraries = config?.libraries

      if (libraries && context.libArg && libraries[context.libArg]) {
        const lib = libraries[context.libArg]
        return lib?.type === "component"
      }

      // TODO: ping registry
      return false
    },
    isIconSelection: ({ event }) => event.output.type === "icon",
    isComponentSelection: ({ event }) => event.output.type === "component",
    isGistUrl: ({ context }) => {
      if (!context.libArg) return false
      try {
        const url = new URL(context.libArg)
        return url.hostname === "gist.github.com"
      } catch {
        return false
      }
    },
    isConfiguredItem: ({ event }) => {
      const value = event.output?.type
      return value && value.startsWith("http")
    },
  },
  actors: {
    loadConfig: fromPromise(getConfig),
    addIconSrc: addIconMachine,
    addComponentSrc: addComponentMachine,
    menuSrc: fromPromise(async ({ input }: { input: { config?: Config } }) => {
      const defaultChoices = [
        {
          title: "Icon",
          value: { type: "icon" },
        },
        {
          title: "Component",
          value: { type: "component" },
        },
      ]

      // Add configured items if they exist
      const configuredChoices =
        input.config?.items?.map((item) => ({
          title: item.name,
          value: {
            type: item.type || "gist",
            url: item.url,
            name: item.name,
            overwrite: item.overwrite,
          },
        })) || []

      logger.info("Menu choices:", [...defaultChoices, ...configuredChoices])

      const response = await prompts({
        type: "select",
        name: "value",
        message: "What do you want to add?",
        choices: [...defaultChoices, ...configuredChoices],
        onState: (state) => {
          if (state.aborted) {
            process.nextTick(() => {
              process.exit(0)
            })
          }
        },
      })

      logger.info("Selected:", response.value)
      return response.value
    }),
    directInstallSrc: fromPromise(
      async ({
        input,
      }: {
        input: {
          url: string
          targetDir?: string
        }
      }) => {
        const gistId = input.url.split("/").pop()
        invariant(gistId, "No gist ID found in URL")

        logger.info(`Fetching gist ${gistId}...`)
        const octokit = new Octokit()
        const { data } = await octokit.gists.get({ gist_id: gistId })

        const files = data.files
        invariant(files, "No files found in gist")

        const payload = Object.values(files)
          .filter(Boolean)
          .map((file) => ({
            name: file.filename,
            files: [
              {
                name: file.filename,
                content: file.content,
                type: "file",
              },
            ],
          }))

        return libraryItemWithContentSchema.array().parse(payload)
      },
    ),
    installComponentsSrc,
  },
}).createMachine({
  id: "add",
  initial: "triageArgs",
  context: ({ input }) => ({
    libArg: input.libArg,
    itemsArg: input.itemsArg,
    targetDir: input.targetDir,
  }),
  states: {
    triageArgs: {
      always: [
        {
          target: "directInstall",
          guard: "isGistUrl",
        },
        {
          target: "loadConfig",
          guard: "configNotLoaded",
        },
        {
          target: "addIcon",
          guard: "isIconLibrary",
        },
        {
          target: "addComponent",
          guard: "isComponentLibrary",
        },
        {
          target: "menu",
        },
      ],
    },
    loadConfig: {
      invoke: {
        id: "loadConfig",
        src: "loadConfig",
        onDone: {
          target: "triageArgs",
          actions: assign({
            config: ({ event }) => event.output,
          }),
        },
      },
    },
    addIcon: {
      invoke: {
        id: "addIcon",
        src: "addIconSrc",
        input: ({ context }) => {
          const libArg =
            context.libArg && context.libArg in v1Libraries
              ? v1Libraries[context.libArg]
              : context.libArg

          console.log({ context })
          return {
            // if no libArg, return undefined
            libArg: libArg,
            itemsArg: context.itemsArg,
            targetDir: context.targetDir,
          }
        },
      },
      on: {
        DONE: "success",
        ERROR: "failure",
      },
    },
    addComponent: {
      invoke: {
        id: "addComponent",
        src: "addComponentSrc",
        input: ({ context }) => {
          console.log({ context })
          return {
            libArg: context.libArg,
            itemsArg: context.itemsArg,
            targetDir: context.targetDir,
          }
        },
      },
      on: {
        DONE: "success",
        ERROR: "failure",
      },
    },
    menu: {
      invoke: {
        id: "menu",
        src: "menuSrc",
        input: ({ context }) => ({
          config: context.config,
        }),
        onDone: [
          {
            guard: "isIconSelection",
            target: "addIcon",
            actions: assign({
              library: ({ event }) => event.output,
            }),
          },
          {
            guard: "isComponentSelection",
            target: "addComponent",
            actions: assign({
              library: ({ event }) => event.output,
            }),
          },
          {
            target: "directInstall",
            actions: [
              assign({
                libArg: ({ event }) => event.output.url,
              }),
              ({ event }) => {
                if (event.output.overwrite === true) {
                  process.env.OVERWRITE = "true"
                }
              },
            ],
            guard: ({ event }) => event.output.type === "gist",
          },
        ],
      },
      on: {
        DONE: "success",
        ERROR: "failure",
      },
    },
    directInstall: {
      invoke: {
        id: "directInstall",
        src: "directInstallSrc",
        input: ({ context }) => ({
          url: context.libArg!,
          targetDir: context.targetDir,
        }),
        onDone: {
          target: "installComponents",
          actions: assign({
            payload: ({ event }) => event.output,
          }),
        },
        onError: "failure",
      },
    },
    installComponents: {
      invoke: {
        id: "installComponents",
        src: "installComponentsSrc",
        input: ({ context }) => ({
          payload: context.payload!,
          transformers: [],
          targetDir: context.targetDir!,
          // TODO: Can we always infer selectedComponents from the payload?
          selectedComponents: context.payload?.map((item) => item.name) ?? [],
          library: context.libArg!,
          packageManager: "npm",
        }),
        onDone: "success",
        onError: "failure",
      },
    },
    success: {
      type: "final",
    },
    failure: {
      type: "final",
    },
  },
})
