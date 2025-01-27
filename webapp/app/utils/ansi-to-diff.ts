import * as entities from "entities"

/**
 * Converts from a number like 15 to a hex string like 'F'
 * @param {number} num
 * @returns {string}
 */
function toHexString(num) {
  let str = num.toString(16)

  while (str.length < 2) {
    str = "0" + str
  }

  return str
}

function stripAnsi(text: string): string {
  // Handle both \x1b[...m and [...]m formats
  return text
    .replace(/\x1b\[(?:\d+;)*\d+m/g, "")
    .replace(/\[(?:\d+;)*\d+m/g, "")
}

export function ansiToDiff(input: string | string[], options = {}) {
  // Handle both string and array inputs
  const text = Array.isArray(input) ? input.join("\n") : input

  const lines = text.split("\n")
  let longestLineNumberGutterWidth = 0
  const lineData = lines.map((line) => {
    const strippedLine = stripAnsi(line)
    const lineNumberMatch = strippedLine.match(/^\s*(\d+)\s*/)
    console.log({ strippedLine, lineNumberMatch })
    const lineNumber = lineNumberMatch ? lineNumberMatch[0] : ""
    const content = strippedLine.slice(lineNumber.trimEnd().length)

    const lineNumberGutterWidth = lineNumber.length
    longestLineNumberGutterWidth = Math.max(
      longestLineNumberGutterWidth,
      lineNumberGutterWidth,
    )

    return {
      lineNumber: lineNumber.trim(),
      gutterWidth: lineNumber.trimEnd().length,
      content: line,
    }
  })

  return lineData
    .map(({ lineNumber, gutterWidth, content }) => {
      // If the line is empty after cleaning, return empty string
      if (!content) return ""
      let line = stripAnsi(content).slice(gutterWidth)

      // Store ANSI information
      const hasRed = content.includes("[31") || content.includes("[91")
      const hasGreen = content.includes("[32") || content.includes("[92")
      const hasUnderline = content.includes("[4") || content.includes(";4")

      // Check if the content is entirely colored (no other color codes)
      const otherColorCodes = content.match(/\x1b\[(\d+(?:;\d+)*)?m/g) || []
      const isEntirelyRed =
        hasRed &&
        !hasGreen &&
        otherColorCodes.every((code) =>
          code.match(
            /\x1b\[(?:31|91|0|1|4|22|24|95)(?:;(?:31|91|0|1|4|22|24|95))*m/,
          ),
        )
      const isEntirelyGreen =
        hasGreen &&
        !hasRed &&
        otherColorCodes.every((code) =>
          code.match(
            /\x1b\[(?:32|92|0|1|4|22|24|95)(?:;(?:32|92|0|1|4|22|24|95))*m/,
          ),
        )

      // Handle underlined content by wrapping it in brackets
      if (hasUnderline) {
        // First, find all underlined segments with their reset codes
        const matches = content.matchAll(
          /\x1b\[(?:\d+;)*4(?:;\d+)*m(.*?)(?:\x1b\[0m|\x1b\[(?!\d*4)\d+m)/g,
        )
        let lastIndex = -1
        let currentGroup = [] as Array<string>
        let groups = [] as Array<string>
        // Group consecutive underlined segments
        for (const match of matches) {
          const startIndex = match.index
          if (startIndex === undefined) continue

          // If this segment is right after the previous one (accounting for reset sequence),
          // add to current group, otherwise start new group
          if (startIndex <= lastIndex) {
            currentGroup.push(match[1])
          } else {
            console.log("new group")
            const skipped = line.slice(lastIndex, startIndex)
            console.log({
              skipped,
              skippedLength: skipped.length,
              skippedTruthy: !!skipped,
            })
            if (currentGroup.length > 0) {
              groups.push(currentGroup.join(""))
            }
            currentGroup = [match[1]]
          }
          lastIndex = startIndex + match[0].length
          console.log(
            "match",
            match[0],
            `${match.index} + ${match[0].length} = ${lastIndex}`,
          )
        }

        if (currentGroup.length > 0) {
          groups.push(currentGroup.join(""))
        }

        // Replace each group with bracketed version
        for (const group of groups) {
          if (hasGreen) {
            line = line.replace(group, `[+ ${group} +]`)
          } else if (hasRed) {
            line = line.replace(group, `[- ${group} -]`)
          }
        }
      }

      // Add diff symbol after line number
      if (isEntirelyGreen) {
        return lineNumber ? `${lineNumber} + ${line}` : `+ ${line}`
      }
      if (isEntirelyRed) {
        return lineNumber ? `${lineNumber} - ${line}` : `- ${line}`
      }

      return lineNumber ? `${lineNumber}   ${line}` : `   ${line}`
    })
    .filter(Boolean)
    .join("\n")
  // .concat(`\n${longestLineNumberGutterWidth}`)
}
