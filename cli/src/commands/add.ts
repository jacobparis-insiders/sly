import { Command } from "commander"
import { addMachine } from "./add.fsm.js"
import { z } from "zod"
import { createActor } from "xstate"

export const add = new Command()
  .name("add")
  .description("add something to your project")
  .argument("[library]", "the library to add from")
  .argument("[items...]", "the items to add")
  .option(
    "-d, --directory [dir], --dir [dir]",
    "set output directory (override sly.json)",
  )
  .option("-o, --overwrite", "overwrite existing items.", false)
  .hook("preAction", () => {
    // Flags override env vars
    const options = add.optsWithGlobals()

    process.env.OVERWRITE = options.overwrite ? "true" : ""
    process.env.DIRECTORY = options.directory ?? ""
  })
  .action(async (libArg, iconsArg) => {
    const options = add.optsWithGlobals()

    const library = z.string().optional().parse(libArg)
    const icons = z
      .array(z.string())
      .default([])
      .parse(iconsArg || [])

    const actor = createActor(addMachine, {
      input: {
        libArg: library,
        iconsArg: icons,
        targetDir: options.directory,
      },
    })
    actor.start()
  })
