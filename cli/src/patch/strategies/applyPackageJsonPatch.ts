import fs from "node:fs"
import path from "node:path"
import { execa } from "execa"
import { ask } from "../../utils/console.js"
import { correctJsonPatch } from "../correctJsonPatch.js"
import { applyPatch } from "./applyPatch.js"
import { compareVersions, validate } from "compare-versions"
import chalk from "chalk"

export async function applyPackageJsonPatch({
  patchPath,
  patchContents,
  targetDir,
}: {
  patchPath: string
  patchContents: string
  targetDir: string
}) {
  const modules = patchToNewModules(patchContents)
  if (modules.length > 0) {
    console.log("New modules detected")
    console.log(">", chalk.green(`npm install ${modules.join(" ")}`))
    if (await ask("Do you want to install modules?")) {
      console.time("Installing modules…")
      await execa("npm", ["install", ...modules], {
        cwd: targetDir,
      })
      console.timeEnd("Installing modules…")

      console.time("Regenerated patch…")
      await new Promise((resolve) => setTimeout(resolve, 1000))
      fs.unlinkSync(patchPath + ".verbose")
      const packageJson = fs.readFileSync(
        path.join(targetDir, "package.json"),
        "utf8"
      )
      fs.writeFileSync(patchPath + ".package.json", packageJson)
      const correctedPatch = correctJsonPatch(patchContents, packageJson, {
        excludeKeys: modules.map((module) =>
          module.split("@").slice(0, -1).join("@")
        ),
      })

      fs.writeFileSync(patchPath, correctedPatch ?? "")
      console.timeEnd("Regenerated patch…")
      await applyPatch({
        patchPath,
        patchContents: correctedPatch ?? "",
        targetDir,
      })
    }
  }
}

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
      if (!key.match(/^@[a-z0-9-]+\/[a-z0-9-]+$/) && !key.match(/^[a-z0-9-]+$/))
        continue
      if (!validate(value.replace("^", "")) && value !== "*") continue

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

      if (compareVersions(value, removesMap.get(key)!) !== 1) {
        console.log("Removing", key, removesMap.get(key))
        continue
      }
    }

    modules.push(`${key}@${value}`)
  }

  return modules
}
