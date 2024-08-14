import fs from "node:fs"
import path from "node:path"
import { execa } from "execa"
import { printPatch } from "../../utils/printPatch.js"
import { confirm } from "../../utils/console.js"
import { trimCwd } from "../../utils/trimCwd.js"
import { intersectPatches } from "./../intersectPatches.js"

export async function applyPatch({
  patchPath,
  patchContents,
  targetDir,
}: {
  patchPath: string
  patchContents: string
  targetDir: string
}) {
  const patchFlags = [
    "-F10",
    "-N",
    "--batch",
    "--ignore-whitespace",
    "--no-backup-if-mismatch",
    // set reject to patchPath.reject
    "--reject-file=" + patchPath + ".reject",
  ]

  const originFile = patchContents.match(/---\s+(.+?)\s+/)?.[1]
  const targetFile = originFile?.replace("a/", "")
  if (!targetFile) {
    console.log("No target file found in patch", patchPath)
    return
  }

  const operation = patchContents.includes("deleted file")
    ? "D"
    : patchContents.includes("new file")
    ? "A"
    : "M"

  const trimmedPatchPath = patchPath.replace(targetDir, "")
  console.time(`Applying… ${trimmedPatchPath}`)

  if (operation === "D") {
    fs.unlinkSync(path.join(targetDir, targetFile!))
    console.timeEnd(`Applying… ${trimmedPatchPath}`)
    return
  }

  if (operation === "M" || operation === "A") {
    try {
      if (fs.existsSync(patchPath + ".reject")) {
        fs.unlinkSync(patchPath + ".reject")
      }
      if (fs.existsSync(patchPath + ".reject.orig")) {
        fs.unlinkSync(patchPath + ".reject.orig")
      }

      await execa(
        "patch",
        [...patchFlags, operation === "M" ? targetFile : ""].filter(Boolean),
        {
          inputFile: patchPath,
          cwd: targetDir,
        }
      )
      console.timeEnd(`Applying… ${trimmedPatchPath}`)
    } catch (error) {
      console.timeEnd(`Applying… ${trimmedPatchPath}`)
      console.log(`Patch rejected for ${targetFile}`)

      const rejectFile = fs.existsSync(patchPath + ".reject")
        ? fs.readFileSync(patchPath + ".reject", "utf8")
        : ""

      const loggablePatch = fs.existsSync(patchPath + ".verbose")
        ? fs.readFileSync(patchPath + ".verbose", "utf8")
        : patchContents

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
