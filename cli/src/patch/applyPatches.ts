import fs from "node:fs"
import path from "node:path"
import { applyPackageJsonPatch } from "./strategies/applyPackageJsonPatch.js"
import { applyPatch } from "./strategies/applyPatch.js"

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
      await applyPackageJsonPatch({
        patchContents,
        targetDir,
        patchPath,
      })
    } else {
      await applyPatch({
        patchPath,
        patchContents,
        targetDir,
      })
    }

    fs.renameSync(patchPath, patchPath.replace(".patch", ".patch.applied"))
  }
}
