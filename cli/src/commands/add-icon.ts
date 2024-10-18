import { Command } from "commander"
import { addIconMachine } from "./add-icon.fsm.js"
import { z } from "zod"
import { createActor } from "xstate"

export const addIcon = new Command()
  .name("add-icon")
  .description("add an icon to your project")
  .argument("[library]", "the icon library to add from")
  .argument("[icons...]", "the icons to add")
  .option(
    "-d, --directory [dir], --dir [dir]",
    "set output directory (override sly.json)",
  )
  .option("-o, --overwrite", "overwrite existing icons.", false)
  .hook("preAction", () => {
    // Flags override env vars
    const options = addIcon.optsWithGlobals()

    process.env.OVERWRITE = options.overwrite ? "true" : ""
    process.env.DIRECTORY = options.directory ?? ""
  })
  .action(async (libArg, iconsArg) => {
    const options = addIcon.optsWithGlobals()

    const library = z.string().optional().parse(libArg)
    const icons = z
      .array(z.string())
      .default([])
      .parse(iconsArg || [])

    const actor = createActor(addIconMachine, {
      input: {
        libArg: library
          ? library.startsWith("iconify:")
            ? library
            : `iconify:${library}`
          : undefined,
        iconsArg: icons,
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
