import { execa } from "execa"

export async function getDiffsFromCommit(
  repoPath: string,
  startHash: string,
  endHash: string = "HEAD"
) {
  const output = await execa("git", ["diff", startHash, endHash], {
    cwd: repoPath,
  })
  const diffs: Array<{
    diff: string
    file: string
    status: "A" | "D" | "R" | "M"
  }> = []
  const lines = output.stdout.split("\n")
  let currentDiff = ""
  let file = ""
  let status: "A" | "D" | "R" | "M" = "M"
  let capturing = false

  const getStatusFromLine = (line: string) => {
    if (line.startsWith("new file")) return "A" as const
    if (line.startsWith("deleted")) return "D" as const
    if (line.startsWith("rename")) return "R" as const
    return "M" as const // If none of the above, assume modified
  }

  for (const line of lines) {
    if (line.startsWith("diff --git a/")) {
      if (capturing && file) {
        diffs.push({ diff: currentDiff.trim(), file, status })
      }
      file = line.split(" ")[2].slice(2) // Extract file after 'a/'
      status = "M" // Reset status for new diff block
      currentDiff = line + "\n"
      capturing = true
    } else {
      if (capturing) {
        if (
          line.startsWith("new file") ||
          line.startsWith("deleted") ||
          line.startsWith("rename")
        ) {
          status = getStatusFromLine(line)
        }
        currentDiff += line + "\n"
      }
    }
  }

  // To capture the last diff in the text
  if (capturing && file) {
    diffs.push({ diff: currentDiff.trim(), file, status })
  }

  return diffs
}
