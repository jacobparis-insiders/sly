export function processCollapsibleDiff(diffLines: string[]) {
  const sections = []

  let currentSection = { lines: [], type: "unchanged", start: 0 }
  let MAX_CONTEXT_LINES = 2

  for (let index = 0; index < diffLines.length; index++) {
    const line = diffLines[index]
    const isChanged = line.startsWith("+") || line.startsWith("-")

    if (isChanged) {
      if (currentSection.type === "unchanged") {
        const contextLines = [
          currentSection.lines.pop(),
          currentSection.lines.pop(),
        ].filter(Boolean)

        // Add the current unchanged section
        sections.push({
          ...currentSection,
          end: index - 1 - contextLines.length,
        })

        sections.push({
          lines: contextLines,
          type: "context",
          start: index - contextLines.length,
          end: index - 1,
        })
        currentSection = { lines: [], type: "changed", start: index }
      } else if (currentSection.type === "context") {
        sections.push({ ...currentSection, end: index - 1 })
        currentSection = { lines: [], type: "changed", start: index }
      }
    } else {
      if (currentSection.type === "changed") {
        // Add the current changed section
        sections.push({ ...currentSection, end: index - 1 })
        // Start a new unchanged section
        currentSection = { lines: [], type: "context", start: index }
      }

      if (currentSection.type === "context") {
        if (currentSection.lines.length >= MAX_CONTEXT_LINES) {
          sections.push({ ...currentSection, end: index - 1 })
          currentSection = { lines: [], type: "unchanged", start: index }
        }
      }
    }
    currentSection.lines.push(line)
  }

  // Add the last section if it has any lines
  if (currentSection.lines.length > 0) {
    sections.push({ ...currentSection, end: diffLines.length - 1 })
  }

  return sections
}
