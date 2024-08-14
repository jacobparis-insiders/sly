import detectIndent from "detect-indent"

export class Diff {
  filenamePre?: string
  filenamePost?: string
  hunks: Hunk[]

  constructor(filenamePre?: string, filenamePost?: string) {
    this.filenamePre = filenamePre
    this.filenamePost = filenamePost
    this.hunks = []
  }

  setHunks(hunks: Hunk[]): void {
    this.hunks = hunks
  }

  toString(): string {
    let string = `--- a/${this.filenamePre}\n+++ b/${this.filenamePost}\n`
    for (const hunk of this.hunks) {
      if (hunk.categoryCounts.remove + hunk.categoryCounts.add === 0) {
        continue
      }

      if (
        hunk.lines
          .filter((line) => line.type !== "retain")
          .every((line) => line.content.trim() === "")
      ) {
        continue
      }

      string += hunk.toString()
    }
    return string.trim() + "\n"
  }

  static fromString(diffText: string, options: { indent?: string } = {}): Diff {
    if (options.indent) {
      const cleanDifftext = diffText
        .replace(/^[^@]*@@/, "@@")
        .replaceAll(/\n |\n-|\n\+/g, "\n")
      const diffIndent = detectIndent(cleanDifftext)

      if (
        diffIndent.indent &&
        !diffIndent.indent.startsWith(options.indent) &&
        diffIndent.indent !== options.indent
      ) {
        diffText = diffText
          .replaceAll(/\n /g, "\n•")
          .replaceAll(diffIndent.indent, options.indent)
          .replaceAll(/\n•/g, "\n ")
      }
    }

    const lines = diffText.replaceAll(/\n\s*$/g, "").split("\n")
    let filenamePre = ""
    let filenamePost = ""

    // Find the file names
    for (const line of lines) {
      if (line.startsWith("--- a/")) {
        filenamePre = line.slice(6).replace(".tmp", "")
      } else if (line.startsWith("+++ b/")) {
        filenamePost = line.slice(6).replace(".tmp", "")
        break
      }
    }

    const diff = new Diff(filenamePre, filenamePost)

    let currentHunk: Hunk | null = null
    for (const line of lines) {
      if (line.startsWith("@@")) {
        if (currentHunk) {
          diff.hunks.push(currentHunk)
        }
        const match = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/)
        if (match) {
          const [, startLinePreEdit, startLinePostEdit] = match
          currentHunk = new Hunk(
            Number(startLinePreEdit),
            Number(startLinePostEdit),
            []
          )
        } else {
          console.error("Failed to parse hunk header:", line)
          continue
        }
      } else if (currentHunk) {
        const type: LineType = line.startsWith("+")
          ? "add"
          : line.startsWith("-")
          ? "remove"
          : "retain"

        const content = line.slice(1)
        currentHunk.addLines([{ type, content }])
      }
    }
    if (currentHunk) {
      diff.hunks.push(currentHunk)
    }
    return diff
  }
}

type LineType = "retain" | "add" | "remove"

interface Line {
  type: LineType
  content: string
}

export class Hunk {
  startLinePreEdit: number
  startLinePostEdit: number
  lines: Line[]
  categoryCounts: { [key in LineType]: number }

  constructor(
    startLinePreEdit: number,
    startLinePostEdit: number,
    lines: Line[]
  ) {
    this.startLinePreEdit = startLinePreEdit
    this.startLinePostEdit = startLinePostEdit
    this.categoryCounts = { retain: 0, add: 0, remove: 0 }
    this.lines = lines
    this.addLines(lines)
  }

  addLines(newLines: Line[]): void {
    for (const line of newLines) {
      this.lines.push(line)
      this.categoryCounts[line.type]++
    }
  }

  toString(): string {
    const lenPreEdit = this.categoryCounts.retain + this.categoryCounts.remove
    const lenPostEdit = this.categoryCounts.retain + this.categoryCounts.add

    let string = `@@ -${this.startLinePreEdit},${lenPreEdit} +${this.startLinePostEdit},${lenPostEdit} @@\n`
    for (const line of this.lines) {
      const prefix =
        line.type === "retain" ? " " : line.type === "add" ? "+" : "-"
      string += `${prefix}${line.content}\n`
    }

    // Can't trim because a hunk could terminate with a whitespace line
    return string
  }

  public popLine(line: Line, index: number): void {
    this.lines.splice(index, 1)
    if (this.categoryCounts[line.type] > 0) {
      this.categoryCounts[line.type]--
    } else {
      console.warn(`Attempted to decrement count for ${line.type} below zero`)
    }
  }
}
