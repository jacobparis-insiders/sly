import fs from "node:fs"
import path from "node:path"
import { execa } from "execa"
import { printPatch } from "../utils/printPatch.js"
import { ask, confirm } from "../utils/console.js"
import { trimCwd } from "../utils/trimCwd.js"
import chalk from "chalk"
import { correctJsonPatch } from "./correctJsonPatch.js"
import { compareVersions, validate } from "compare-versions"
import { intersectPatches } from "./intersectPatches.js"
function patchToNewModules(contents: string) {
  // find all lines starting with +
  // get their key/value pairs like this
  //+ "remix-flat-routes": "^0.6.5",

  const lines = contents.split("\n")

  const modules = []
  const removesMap = new Map<string, string>()
  const additionsMap = new Map<string, string>()

  for (const line of lines) {
    if (!line.startsWith("+") && !line.startsWith("-")) continue

    const match = line
      .slice(1)
      .match(/^\s*"(?<key>[^"]*)"\s*:\s*"?(?<value>[^"]*)"?,?$/)
    if (match && match.groups) {
      const { key, value } = match.groups
      if (!key.match(/^@[a-z-]+\/[a-z-]/) && !key.match(/^[a-z-]+$/)) continue
      if (!validate(value) && value !== "*") continue

      if (line.startsWith("-")) {
        removesMap.set(key, value)
      } else {
        additionsMap.set(key, value)
      }
    }
  }

  for (const [key, value] of additionsMap.entries()) {
    if (removesMap.has(key)) {
      // if removing a higher version, skip
      // if adding a higher version than removing, include

      if (compareVersions(value, removesMap.get(key)!) === 1) {
        continue
      }
    }

    modules.push(`${key}@${value}`)
  }

  return modules
}
export async function applyPatches({
  patchesDir,
  targetDir,
}: {
  patchesDir: string
  targetDir: string
}) {
  console.log("Applying patches")
  const patches = fs
    .readdirSync(patchesDir)
    .filter((file) => file.endsWith(".patch"))
    .sort()

  for (const patch of patches) {
    const patchPath = path.join(patchesDir, patch)
    const patchContents = fs.readFileSync(patchPath, "utf8")

    // Manually updating the modules is a pain so we can let the user install them first
    if (patchContents.includes("--- a/package.json")) {
      const modules = patchToNewModules(patchContents)
      if (modules.length > 0) {
        console.log("New modules detected")
        console.log(">", chalk.green(`npm install ${modules.join(" ")}`))
        if (await ask("Do you want to install modules?")) {
          await execa("npm", ["install", ...modules], {
            cwd: targetDir,
          })
          console.time("Regenerated patch…")
          await new Promise((resolve) => setTimeout(resolve, 1000))
          fs.unlinkSync(patchPath + ".verbose")
          const packageJson = fs.readFileSync(
            path.join(targetDir, "package.json"),
            "utf8"
          )
          fs.writeFileSync(patchPath + ".package.json", packageJson)
          const correctedPatch = correctJsonPatch(patchContents, packageJson)

          fs.writeFileSync(patchPath, correctedPatch ?? "")
          console.timeEnd("Regenerated patch…")
          await applyPatch({
            filename: patchPath,
            contents: correctedPatch ?? "",
          })

          fs.renameSync(
            patchPath,
            patchPath.replace(".patch", ".patch.applied")
          )

          continue
        }
      }
    }

    await applyPatch({
      filename: patchPath,
      contents: patchContents,
    })

    fs.renameSync(patchPath, patchPath.replace(".patch", ".patch.applied"))
  }

  async function applyPatch({
    filename,
    contents,
  }: {
    filename: string
    contents: string
  }) {
    const patchFlags = [
      "-F10",
      "-N",
      "--batch",
      "--ignore-whitespace",
      "--no-backup-if-mismatch",
      // set reject to filename.reject
      "--reject-file=" + filename + ".reject",
    ]

    const originFile = contents.match(/---\s+(.+?)\s+/)?.[1]
    const targetFile = originFile?.replace("a/", "")
    if (!targetFile) {
      console.log("No target file found in patch", filename)
      return
    }

    const operation = contents.includes("deleted file")
      ? "D"
      : contents.includes("new file")
      ? "A"
      : "M"

    const trimmedPatchPath = filename.replace(targetDir, "")
    console.time(`Applying… ${trimmedPatchPath}`)

    if (operation === "D") {
      fs.unlinkSync(path.join(targetDir, targetFile!))
      console.timeEnd(`Applying… ${trimmedPatchPath}`)
      return
    }

    if (operation === "M" || operation === "A") {
      try {
        if (fs.existsSync(filename + ".reject")) {
          fs.unlinkSync(filename + ".reject")
        }
        if (fs.existsSync(filename + ".reject.orig")) {
          fs.unlinkSync(filename + ".reject.orig")
        }

        await execa(
          "patch",
          [...patchFlags, operation === "M" ? targetFile : ""].filter(Boolean),
          {
            inputFile: filename,
            cwd: targetDir,
          }
        )
        console.timeEnd(`Applying… ${trimmedPatchPath}`)
      } catch (error) {
        console.timeEnd(`Applying… ${trimmedPatchPath}`)
        console.log(`Patch rejected for ${targetFile}`)

        const rejectFile = fs.existsSync(filename + ".reject")
          ? fs.readFileSync(filename + ".reject", "utf8")
          : ""

        const loggablePatch = fs.existsSync(filename + ".verbose")
          ? fs.readFileSync(filename + ".verbose", "utf8")
          : contents

        console.log(
          printPatch(
            rejectFile
              ? intersectPatches(loggablePatch, rejectFile)
              : loggablePatch,
            {
              filename: trimCwd(path.join(targetDir, targetFile ?? "")),
            }
          )
        )

        await confirm(
          "Please resolve the conflict, stage the changes, and press Enter to continue..."
        )
      }
    }
  }
}
