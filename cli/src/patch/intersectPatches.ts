import { Diff, Hunk } from "./Diff.js"

/**
 * Returns patchA with only changes that are present in patchB and all other changes retained
 *
 * @example
 * ```ts
 * intersectPatches(patchContents, rejectContents)
 * ```
 */
export function intersectPatches(patchA: string, patchB: string): string {
  const diffA = Diff.fromString(patchA)
  const diffB = Diff.fromString(patchB)

  diffA.hunks = diffB.hunks.map((rejectHunk) => {
    const candidates = new Map<Hunk, number>()
    candidates.set(rejectHunk, 0.5)
    for (const hunk of diffA.hunks) {
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

    // return highest scoring candidate
    const bestMatch = Array.from(candidates.entries()).sort(
      (a, b) => b[1] - a[1]
    )[0][0]

    const newHunk = new Hunk(
      bestMatch.startLinePostEdit,
      bestMatch.startLinePostEdit,
      bestMatch.lines.map((line) => {
        if (
          rejectHunk.lines.some(
            (rejectLine) =>
              rejectLine.type === line.type &&
              rejectLine.content === line.content
          )
        ) {
          return { type: "retain", content: line.content }
        }
        return line
      })
    )

    return newHunk
  })

  return diffA.toString().trim() + "\n"
}
