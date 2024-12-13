import fs from "fs/promises"
import path from "path"

import jsonata from "jsonata"
import ora from "ora"
import { libraryItemWithContentSchema } from "site/app/schemas.js"
import { z } from "zod"

type Component = z.infer<typeof libraryItemWithContentSchema>

type ComponentFile = Component["files"][number]

type ApplyOptions = {
  targetDir: string
}

export function installFile(file: ComponentFile, options: ApplyOptions) {
  switch (file.type) {
    case "jsonata":
      return applyJsonata(file, options)
    default:
      return applyNewFile(file, options)
  }
}

async function applyNewFile(file: ComponentFile, options: ApplyOptions) {
  const targetFile = path.resolve(options.targetDir, file.path || file.name)
  const spinner = ora(`  Installing ${file.path || file.name}...\n`).start()
  await fs.mkdir(path.dirname(targetFile), { recursive: true })
  await fs.writeFile(targetFile, file.content)
  spinner.succeed(`  Installed ${targetFile.replace(process.cwd(), "")}`)
}

async function applyJsonata(file: ComponentFile, options: ApplyOptions) {
  const targetFile = path.resolve(options.targetDir, file.path || file.name)
  const spinner = ora(`  Modifying ${file.path || file.name}...\n`).start()
  const input = await fs.readFile(targetFile.replace(process.cwd(), ""))
  const output = await jsonata(file.content).evaluate(input)
  await fs.mkdir(path.dirname(targetFile), { recursive: true })
  await fs.writeFile(targetFile, output)
  spinner.succeed(`  Modified ${targetFile.replace(process.cwd(), "")}`)
}
