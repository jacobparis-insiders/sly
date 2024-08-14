import fs from "node:fs"
import path from "node:path"
import chalk from "chalk"
import { correctFilePatch } from "./correctFilePatch.js"
import { correctJsonPatch } from "./correctJsonPatch.js"
import { minifyPatch } from "./minifyPatch.js"

export async function createPatches({
  diffs,
  patchesDir,
  targetDir,
  dryRun = false,
  ignoredPaths,
}: {
  diffs: Array<{
    diff: string
    file: string
    status: "A" | "D" | "R" | "M"
  }>
  patchesDir: string
  targetDir: string
  ignoredPaths: string[]
  dryRun?: boolean
}) {
  if (!dryRun) {
    fs.mkdirSync(patchesDir, { recursive: true })
  }

  const context = { patchNumber: 0 }
  for (const { diff, file, status } of diffs) {
    if (shouldIgnorePath(file)) {
      console.log(
        dryRun ? "(dry run)" : "",
        chalk.yellow(`SKIP ${status}`),
        `${file}`,
        "(ignored)"
      )
      continue
    }

    const targetPath = path.join(targetDir, file)

    switch (status) {
      case "A":
        if (!dryRun) {
          const patchPath = path.join(
            patchesDir,
            `${(context.patchNumber++).toString().padStart(3, "0")}.patch`
          )
          fs.writeFileSync(patchPath, diff)
        }
        console.log(dryRun ? "(dry run)" : "", chalk.green("A"), `${file}`)
        break
      case "M":
        if (fs.existsSync(targetPath)) {
          if (!dryRun) {
            const patchPath = path.join(
              patchesDir,
              `${(context.patchNumber++).toString().padStart(3, "0")}.patch`
            )
            fs.mkdirSync(path.dirname(patchPath), { recursive: true })

            const targetFileContent = fs.readFileSync(targetPath, "utf-8")
            const isJson = targetPath.endsWith(".json")
            const correctedPatch = isJson
              ? correctJsonPatch(diff, targetFileContent)
              : correctFilePatch(diff, targetFileContent)

            if (correctedPatch) {
              fs.writeFileSync(patchPath, minifyPatch(correctedPatch))
              fs.writeFileSync(patchPath + ".verbose", correctedPatch)
              fs.writeFileSync(patchPath + ".orig", diff)
            } else {
              console.log(chalk.yellow("SKIP M"), `${file} (no changes)`)
              continue
            }
          } else {
            console.log("(dry run)", chalk.cyan("M"), `${file}`)
          }
        } else {
          console.log(
            dryRun ? "(dry run)" : "",
            chalk.yellow("SKIP M"),
            `${file} (not found)`
          )
        }
        break
      case "D":
        if (fs.existsSync(targetPath)) {
          if (!dryRun) {
            const patchPath = path.join(
              patchesDir,
              `${(context.patchNumber++).toString().padStart(3, "0")}.patch`
            )
            fs.writeFileSync(patchPath, diff)
          }
          console.log(dryRun ? "(dry run)" : "", chalk.red("D"), `${file}`)
        } else {
          console.log(
            dryRun ? "(dry run)" : "",
            chalk.red("SKIP D"),
            `${file} (not found)`
          )
        }
        break
      case "R":
        if (fs.existsSync(targetPath)) {
          if (!dryRun) {
            const patchPath = path.join(
              patchesDir,
              `${(context.patchNumber++).toString().padStart(3, "0")}.patch`
            )
            fs.writeFileSync(patchPath, diff)
          }
          console.log(dryRun ? "(dry run)" : "", chalk.magenta("R"), `${file}`)
        } else {
          console.log(
            dryRun ? "(dry run)" : "",
            chalk.magenta("SKIP R"),
            `${file} (not found)`
          )
        }
        break
      default:
        console.log(chalk.gray(`Unhandled status ${status} for file: ${file}`))
    }
  }

  function shouldIgnorePath(file: string) {
    return ignoredPaths.some(
      (ignoredPath) =>
        file === ignoredPath || file.startsWith(`${ignoredPath}/`)
    )
  }
}
