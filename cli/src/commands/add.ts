import { Command } from "commander"
import { addMachine } from "./add.fsm.js"
import { z } from "zod"
import { createActor } from "xstate"
import { initLibrary } from "./library.js"

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
  .option(
    "-s, --save",
    "save library configuration without adding items",
    false,
  )
  .hook("preAction", () => {
    // Flags override env vars
    const options = add.optsWithGlobals()

    process.env.OVERWRITE = options.overwrite ? "true" : ""
    process.env.DIRECTORY = options.directory ?? ""
    process.env.SAVE = options.save ? "true" : ""
  })
  .action(async (libArg, itemsArg) => {
    const options = add.optsWithGlobals()

    const library = z.string().optional().parse(libArg)
    const items = z
      .array(z.string())
      .default([])
      .parse(itemsArg || [])

    // If --save flag is used with library but no items, just save the config
    if (options.save && library && items.length === 0) {
      await initLibrary({ name: library })
      return
    }

    const actor = createActor(addMachine, {
      input: {
        libArg: library,
        itemsArg: items,
        targetDir: process.env.DIRECTORY,
      },
    })
    actor.start()
  })
