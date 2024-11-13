import { Command } from "commander"
import { addComponentMachine } from "./add-component.fsm.js"
import { z } from "zod"
import { createActor } from "xstate"

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
  .hook("preAction", () => {
    // Flags override env vars
    const options = addComponent.optsWithGlobals()

    process.env.OVERWRITE = options.overwrite ? "true" : ""
    process.env.DIRECTORY = options.directory ?? ""
  })
  .action(async (libArg, componentsArg) => {
    const options = addComponent.optsWithGlobals()

    const library = z.string().optional().parse(libArg)
    const components = z
      .array(z.string())
      .default([])
      .parse(componentsArg || [])

    const actor = createActor(addComponentMachine, {
      input: {
        libArg: library
          ? library.startsWith("iconify:")
            ? library
            : `iconify:${library}`
          : undefined,
        componentsArg: components,
        targetDir: options.directory,
      },
      // inspect(inspectionEvent) {
      //   console.log(inspectionEvent.type)

      //   if (inspectionEvent.type === "@xstate.microstep") {
      //     for (const transition of inspectionEvent._transitions) {
      //       console.log(JSON.stringify(transition.toJSON(), null, 2))
      //     }
      //   }
      // },
    })
    actor.start()
  })
