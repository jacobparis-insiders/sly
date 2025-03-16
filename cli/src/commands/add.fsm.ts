import { assign, fromPromise, setup } from "xstate"
import { addIconMachine } from "./add-icon.fsm.js"
import prompts from "prompts"
import { addComponentMachine } from "./add-component.fsm.js"

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
      iconsArg?: string[]
      targetDir?: string
    },
    context: {} as {
      libArg?: string
      iconsArg?: string[]
      targetDir?: string
    },
  },
  guards: {
    isIconLibrary: ({ context }) => {
      return Boolean(context.libArg)
    },
    isComponentLibrary: ({ context }) => {
      return Boolean(context.libArg)
    },
    isIconSelection: ({ event }) => event.output.type === "icon",
    isComponentSelection: ({ event }) => event.output.type === "component",
  },
  actors: {
    addIconSrc: addIconMachine,
    addComponentSrc: addComponentMachine,
    menuSrc: fromPromise(async () => {
      return prompts({
        type: "select",
        name: "type",
        message: "What do you want to add?",
        choices: [
          {
            title: "Icon",
            value: "icon",
          },
          {
            title: "Component",
            value: "component",
          },
        ],
        onState: (state) => {
          if (state.aborted) {
            process.nextTick(() => {
              process.exit(0)
            })
          }
        },
      })
    }),
  },
}).createMachine({
  id: "add",
  initial: "triageArgs",
  context: ({ input }) => ({
    libArg: input.libArg,
    iconsArg: input.iconsArg,
    targetDir: input.targetDir,
  }),
  states: {
    triageArgs: {
      always: [
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
    addIcon: {
      invoke: {
        id: "addIcon",
        src: "addIconSrc",
        input: ({ context }) => {
          const libArg =
            context.libArg && context.libArg in v1Libraries
              ? v1Libraries[context.libArg]
              : context.libArg

          return {
            // if no libArg, return undefined
            libArg: libArg
              ? libArg.startsWith("iconify:")
                ? libArg
                : `iconify:${libArg}`
              : undefined,
            iconsArg: context.iconsArg,
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
          return {
            libArg: context.libArg,
            iconsArg: context.iconsArg,
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
        onDone: [
          {
            guard: "isIconSelection",
            target: "addIcon",
            actions: ({ event }) =>
              assign({
                library: event.output,
              }),
          },
          {
            guard: "isComponentSelection",
            target: "addComponent",
            actions: ({ event }) =>
              assign({
                library: event.output,
              }),
          },
        ],
      },
      on: {
        DONE: "success",
        ERROR: "failure",
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
