import { Command } from "commander"
import { addComponentMachine } from "./add-component.fsm.js"
import { z } from "zod"
import { createActor } from "xstate"
import { initLibrary } from "./library.js"

export const addComponent = new Command()
  .name("add-component")
  .description("add a component to your project")
  .argument("[library]", "the component library to add from")
  .argument("[components...]", "the components to add")
  .option(
    "-d, --directory [dir], --dir [dir]",
    "set output directory (override sly.json)",
  )
  .option("-o, --overwrite", "overwrite existing components.", false)
  .option(
    "-s, --save",
    "save library configuration without adding components",
    false,
  )
  .hook("preAction", () => {
    // Flags override env vars
    const options = addComponent.optsWithGlobals()

    process.env.OVERWRITE = options.overwrite ? "true" : ""
    process.env.DIRECTORY = options.directory ?? ""
    process.env.SAVE = options.save ? "true" : ""
  })
  .action(async (libArg, itemsArg) => {
    const options = addComponent.optsWithGlobals()

    const library = z.string().optional().parse(libArg)
    const components = z
      .array(z.string())
      .default([])
      .parse(itemsArg || [])

    // If --save flag is used with library but no components, just save the config
    if (options.save && library && components.length === 0) {
      await initLibrary({ name: library, type: "component" })
      return
    }

    const actor = createActor(addComponentMachine, {
      input: {
        libArg: library,
        itemsArg: components,
        targetDir: options.directory,
      },
    })
    actor.start()
  })
