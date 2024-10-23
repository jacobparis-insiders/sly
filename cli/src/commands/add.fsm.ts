import { assign, fromPromise, setup } from "xstate"
import { addIconMachine } from "./add-icon.fsm.js"
import prompts from "prompts"

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
  },
  actors: {
    addIconSrc: addIconMachine,
    menuSrc: fromPromise(async ({ input }) => {
      return prompts({
        type: "select",
        name: "type",
        message: "What do you want to add?",
        choices: [
          {
            title: "Icon",
            value: "icon",
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
          target: "menu",
        },
      ],
    },
    addIcon: {
      invoke: {
        id: "addIcon",
        src: "addIconSrc",
        input: ({ context }) => ({
          libArg: context.libArg?.startsWith("iconify:")
            ? context.libArg
            : `iconify:${context.libArg}`,
          iconsArg: context.iconsArg,
          targetDir: context.targetDir,
        }),
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
        onDone: {
          target: "addIcon",
          actions: ({ event }) =>
            assign({
              library: event.output,
            }),
        },
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
