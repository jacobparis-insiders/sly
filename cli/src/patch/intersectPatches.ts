import { Diff, Hunk } from "./Diff.js"

/**
 * Returns patchA with only hunks that are present in patchB
 *
 * @example
 * ```ts
 * intersectPatches(patchContents, rejectContents)
 * ```
 */
export function intersectPatches(patchA: string, patchB: string): string {
  const diffA = Diff.fromString(patchA)
  const diffB = Diff.fromString(patchB)

  const usedHunks = new Set<Hunk>()

  diffA.hunks = diffB.hunks.map((rejectHunk) => {
    const candidates = new Map<Hunk, number>()
    candidates.set(rejectHunk, 1)
    for (const hunk of diffA.hunks) {
      if (usedHunks.has(hunk)) continue

      let score = 0

      for (const rejectLine of rejectHunk.lines) {
        for (const line of hunk.lines) {
          if (line.type !== rejectLine.type) continue
          if (line.content.trim() === "") continue
          if (line.content.trim() === rejectLine.content.trim()) {
            score++
            break
          }
        }
      }

      candidates.set(hunk, score)
    }

    console.log({ candidates })

    // return highest scoring candidate
    const bestMatch = Array.from(candidates.entries()).sort(
      (a, b) => b[1] - a[1]
    )

    usedHunks.add(bestMatch[0][0])

    return bestMatch[0][0]
  })

  return diffA.toString().trim() + "\n"
}
