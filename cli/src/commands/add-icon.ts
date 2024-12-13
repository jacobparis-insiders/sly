import { Command } from "commander"
import { addIconMachine } from "./add-icon.fsm.js"
import { z } from "zod"
import { createActor } from "xstate"
import { initLibrary } from "./library.js"

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
  .option(
    "-s, --save",
    "save library configuration without adding icons",
    false,
  )
  .hook("preAction", () => {
    // Flags override env vars
    const options = addIcon.optsWithGlobals()

    process.env.OVERWRITE = options.overwrite ? "true" : ""
    process.env.DIRECTORY = options.directory ?? ""
    process.env.SAVE = options.save ? "true" : ""
  })
  .action(async (libArg, itemsArg) => {
    const options = addIcon.optsWithGlobals()

    const library = z.string().optional().parse(libArg)
    const icons = z
      .array(z.string())
      .default([])
      .parse(itemsArg || [])

    // If --save flag is used with library but no icons, just save the config
    if (options.save && library && icons.length === 0) {
      await initLibrary({ name: library, type: "icon" })
      return
    }

    const actor = createActor(addIconMachine, {
      input: {
        libArg: library,
        itemsArg: icons,
        targetDir: options.directory,
      },
    })
    actor.start()
  })
