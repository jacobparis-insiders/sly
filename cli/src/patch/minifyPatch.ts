import { Diff, Hunk } from "./Diff.js"

export function minifyPatch(patchText: string): string {
  const diff = Diff.fromString(patchText)

  diff.hunks = diff.hunks.flatMap((hunk) => {
    const rootHunk = new Hunk(hunk.startLinePreEdit, hunk.startLinePostEdit, [])
    const extraHunks: Array<typeof rootHunk> = []

    let i = 0
    while (i < hunk.lines.length) {
      if (hunk.lines[i]?.type === "retain" || hunk.lines[i]?.type === "add") {
        let foundActionableLine = false
        const batchStartIndex = i
        const batch = []

        for (; i < hunk.lines.length; i++) {
          if (hunk.lines[i].type === "remove") {
            break
          }

          if (hunk.lines[i].type === "add") {
            foundActionableLine = true
          }

          batch.push(hunk.lines[i])
        }

        if (batch.length > 0 && foundActionableLine) {
          const newHunk = new Hunk(
            hunk.startLinePreEdit + batchStartIndex,
            hunk.startLinePostEdit + batchStartIndex,
            []
          )
          newHunk.addLines(batch)
          extraHunks.push(newHunk)
        }
      }

      if (hunk.lines[i]?.type === "remove") {
        const batchStartIndex = i
        const batch = []

        for (; i < hunk.lines.length; i++) {
          if (hunk.lines[i].type === "retain") {
            break
          }

          batch.push(hunk.lines[i])
        }
        if (batch.length > 0) {
          const newHunk = new Hunk(
            hunk.startLinePreEdit + batchStartIndex,
            hunk.startLinePostEdit + batchStartIndex,
            []
          )
          newHunk.addLines(batch)
          extraHunks.push(newHunk)
        }
      }

      i++
    }

    return rootHunk.lines.length > 0 ? [rootHunk, ...extraHunks] : extraHunks
  })

  return diff.toString().trim() + "\n"
}
