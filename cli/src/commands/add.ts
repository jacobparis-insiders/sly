import { Command } from "commander"
import { addIconMachine } from "./add.fsm.js"
import { z } from "zod"
import { createActor } from "xstate"

export const addIcon = new Command()
  .name("add")
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
        libArg: library,
        iconsArg: icons,
        targetDir: options.directory,
      },
    })
    actor.start()
  })
