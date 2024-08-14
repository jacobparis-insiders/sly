import { Command } from "commander"
import { z } from "zod"
import { getConfig, setConfig } from "../get-config.js"
import path from "node:path"
import fs from "node:fs"
import { applyPatches } from "../patch/applyPatches.js"
import { ask } from "../utils/console.js"
import { trimCwd } from "../utils/trimCwd.js"
import chalk from "chalk"
import { cloneTemplateRepo } from "../cloneTemplateRepo.js"
import { getDiffsFromCommit } from "../patch/getDiffsFromCommit.js"
import { createPatches } from "../patch/createPatches.js"

const setCommand = new Command()
  .name("set")
  .description("set the template")
  .option("--repo [repository], --repository [repository]", "the repository")
  .option("--head [head]", "the head to update from")
  .option(
    "--ignore <paths>",
    "paths to ignore",
    (value, previous) => previous.concat([value]),
    [] as Array<string>
  )
  .action(async () => {
    console.log(setCommand.optsWithGlobals())
    const options = z
      .object({
        repo: z.string().url("Repo must be a valid GitHub URL").optional(),
        head: z.string().optional(),
        ignore: z.array(z.string()).optional(),
      })
      .refine((options) => options.repo || options.head || options.ignore, {
        message: "Pass either --repo or --head or --ignore",
      })
      .safeParse(setCommand.optsWithGlobals())

    if (!options.success) {
      console.error(printZodError(options.error))
      return
    }

    await setConfig((config) => {
      return {
        ...config,
        template: {
          repo: options.data.repo ?? config.template?.repo,
          head: options.data.head ?? config.template?.head,
          ignore: Array.from(
            new Set([
              ...(config.template?.ignore ?? []),
              ...(options.data.ignore ?? []),
            ])
          ),
        },
      }
    })
  })

const updateCommand = new Command()
  .name("update")
  .description("update the template")
  .option("-r, --repo [repository]", "the repository")
  .option("-h, --head [head]", "the head to update from")
  .option(
    "--ignore <paths>",
    "paths to ignore",
    (value, previous) => previous.concat([value]),
    [] as Array<string>
  )
  .option("--dry-run", "dry run the update", false)
  .option("--no-apply", "apply the patches", true)
  .action(async () => {
    const config = await getConfig()
    const options = z
      .object({
        repo: z
          .string({
            required_error: "Use --repo flag or set sly.json#template.repo",
          })
          .url("Repo must be a valid GitHub URL")
          .default(config?.template?.repo as string),
        head: z
          .string({
            required_error: "Use --head flag or set sly.json#template.head",
          })
          .default(config?.template?.head as string),
        ignore: z.array(z.string()).optional(),
        dryRun: z.boolean().optional(),
        apply: z.boolean().optional(),
        cwd: z.string(),
      })
      .safeParse(updateCommand.optsWithGlobals())

    if (!options.success) {
      console.error(printZodError(options.error))
      return
    }

    const templateDirectory = path.join(
      options.data.cwd,
      "node_modules",
      ".sly",
      "template"
    )

    console.time("Checked for updates")
    await cloneTemplateRepo({
      repository: options.data.repo,
      head: options.data.head,
      directory: path.join(templateDirectory, "repository"),
    })
    console.timeEnd("Checked for updates")

    let shouldGetDiffs = true
    if (fs.existsSync(path.join(templateDirectory, "patches"))) {
      const shouldClearPatches = await ask(
        chalk.red(
          `Patches found at ${trimCwd(path.join(templateDirectory, "patches"))}`
        ) + chalk.bold("\nDo you want to replace them with new patches?")
      )

      if (shouldClearPatches) {
        fs.rmSync(path.join(templateDirectory, "patches"), {
          recursive: true,
        })
      } else {
        shouldGetDiffs = false
      }
    }

    if (shouldGetDiffs) {
      console.time("Fetched diffs")
      const diffs = await getDiffsFromCommit(
        path.join(templateDirectory, "repository"),
        options.data.head
      )
      console.log(`Found ${diffs.length} diffs`)
      console.timeEnd("Fetched diffs")

      if (diffs.length === 0) {
        console.log("No new diffs to process")
        return
      }

      // Sort patches in a way that minimizes red lines while dealing with merge conflicts
      diffs.sort((a, b) => {
        // package.json changes go first
        if (a.file === "package.json") return -1
        if (b.file === "package.json") return 1

        // adds are always successful
        if (a.status === "A") return -1
        if (b.status === "A") return 1

        // prioritize deletes
        if (a.status === "D") return -1
        if (b.status === "D") return 1

        // prioritize renames
        if (a.status === "R") return -1
        if (b.status === "R") return 1

        // otherwise, sort by filename length
        return a.file.length - b.file.length
      })

      await createPatches({
        diffs,
        patchesDir: path.join(templateDirectory, "patches"),
        targetDir: options.data.cwd,
        dryRun: options.data.dryRun,
        ignoredPaths: [
          "package-lock.json",
          "yarn.lock",
          "pnpm-lock.yaml",
          "bun.lockb",
          ...(config?.template?.ignore ?? []),
          ...(options.data.ignore ?? []),
        ],
      })
    }

    if (options.data.apply) {
      await applyPatches({
        patchesDir: path.join(templateDirectory, "patches"),
        targetDir: options.data.cwd,
      })
    } else {
      console.log("Skipping apply")
    }
  })

export const template = new Command()
  .name("template")
  .description("manage the template")
  .addCommand(setCommand)
  .addCommand(updateCommand)

function printZodError(error: z.ZodError) {
  const flatErrors = error.flatten()
  return Object.values(flatErrors.fieldErrors)
    .concat(flatErrors.formErrors)
    .join("\n")
}
