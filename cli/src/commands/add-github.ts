import { Command } from "commander"
import { addGitHubMachine } from "./add-github.fsm.js"
import { z } from "zod"
import { createActor } from "xstate"

export const addGitHub = new Command()
  .name("add-github")
  .description("add a component from a GitHub repository")
  .argument("[repo]", "the GitHub repository to add from")
  .argument("[components...]", "the components to add")
  .option(
    "-d, --directory [dir], --dir [dir]",
    "set output directory (override sly.json)",
  )
  .option("-o, --overwrite", "overwrite existing components.", false)
  .hook("preAction", () => {
    // Flags override env vars
    const options = addGitHub.optsWithGlobals()

    process.env.OVERWRITE = options.overwrite ? "true" : ""
    process.env.DIRECTORY = options.directory ?? ""
  })
  .action(async (repoArg, componentsArg) => {
    const options = addGitHub.optsWithGlobals()

    const repo = z.string().optional().parse(repoArg)
    const components = z
      .array(z.string())
      .default([])
      .parse(componentsArg || [])

    const actor = createActor(addGitHubMachine, {
      input: {
        repoArg: repo,
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
