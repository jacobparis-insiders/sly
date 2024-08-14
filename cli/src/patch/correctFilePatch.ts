import detectIndent from "detect-indent"

import { Diff } from "./Diff.js"
export function correctFilePatch(patchText: string, targetFileContent: string) {
  const indent = detectIndent(targetFileContent).indent
  const linesDict = targetFileContent.split("\n").reduce(
    (acc, line, index) => {
      acc[index + 1] = line
      return acc
    },
    {} as { [key: number]: string }
  )

  const diff = Diff.fromString(patchText, {
    indent: indent,
  })
  // Reorder hunks
  diff.hunks.sort((a, b) => a.startLinePreEdit - b.startLinePreEdit)

  // BUG SOLVED: must match lines when the first lines of the hunk aren't present in the file
  // Adjust hunk line numbers if necessary
  for (const hunk of diff.hunks) {
    let foundMatch = false
    const candidates = []
    // this is called a spiral search
    for (let lineNumber = 0; lineNumber < hunk.lines.length; lineNumber++) {
      for (let index = 0; index <= Object.keys(linesDict).length * 2; index++) {
        const i = index % 2 === 0 ? index / 2 : -(Math.floor(index / 2) + 1)
        const adjustedStartLine = hunk.startLinePreEdit + i
        if (adjustedStartLine < 0) continue
        if (!linesDict[adjustedStartLine]) {
          continue
        }

        const similarity = weightedStringSimilarity(
          hunk.lines[lineNumber].content,
          linesDict[adjustedStartLine]
        )

        if (similarity === 1) {
          hunk.startLinePreEdit = adjustedStartLine
          hunk.startLinePostEdit += i
          foundMatch = true
          break
        }

        if (similarity >= 0.9) {
          foundMatch = true

          candidates.push({
            index: i,
            similarity,
          })
        }
      }

      if (candidates.length > 0) {
        foundMatch = true

        candidates.sort((a, b) => b.similarity - a.similarity)
        hunk.startLinePreEdit += candidates[0].index - lineNumber
        hunk.startLinePostEdit += candidates[0].index - lineNumber
      }

      if (foundMatch) break
    }

    let hunkInd = 0
    while (hunkInd < hunk.lines.length) {
      const line = hunk.lines[hunkInd]

      if (!line) continue

      const exactMatchLine = Object.values(linesDict).find(
        (content) => content === line.content
      )

      if (line.type === "add") {
        if (exactMatchLine) {
          const previousLine = hunk.lines[hunkInd - 1]
          if (previousLine.type === "remove") {
            // if there's a remove right before the addition, it's a modification
            // if the line to remove isn't in the file, we can assume this has already applied
            // instead of retaining we drop the removal entirely

            if (!Object.values(linesDict).includes(previousLine.content)) {
              console.log("dropping removal", previousLine)
              hunk.lines.splice(hunkInd - 1, 1)
              hunk.categoryCounts.remove--
              hunkInd--
              continue
            }
          }

          console.log("retaining", line)
          line.type = "retain"
          hunk.categoryCounts.retain++
          hunk.categoryCounts.add--
          hunkInd++

          continue
        }
      }

      hunkInd++
    }
  }

  const printedDiff = diff.toString().trim() + "\n"
  return printedDiff.includes("@@") ? printedDiff : null
}

function weightedStringSimilarity(str1: string, str2: string): number {
  const wordWeight = 3
  const numberWeight = 1
  const symbolWeight = 0.1

  function charWeight(char: string): number {
    if (/[a-zA-Z]/.test(char)) return wordWeight
    // include numbers and decimals in the number weight
    if (/[\d.]/.test(char)) return numberWeight
    return symbolWeight
  }

  function levenshtein(a: string, b: string): number {
    const lenA = a.length
    const lenB = b.length
    const dp: number[][] = Array.from({ length: lenA + 1 }, () =>
      Array(lenB + 1).fill(0)
    )

    for (let i = 0; i <= lenA; i++) dp[i][0] = i
    for (let j = 0; j <= lenB; j++) dp[0][j] = j

    for (let i = 1; i <= lenA; i++) {
      for (let j = 1; j <= lenB; j++) {
        const cost =
          a[i - 1] === b[j - 1]
            ? 0
            : charWeight(a[i - 1]) + charWeight(b[j - 1])
        dp[i][j] = Math.min(
          dp[i - 1][j] + charWeight(a[i - 1]), // Deletion
          dp[i][j - 1] + charWeight(b[j - 1]), // Insertion
          dp[i - 1][j - 1] + cost // Substitution
        )
      }
    }

    return dp[lenA][lenB]
  }

  const distance = levenshtein(str1, str2)
  const maxWeight = Math.max(str1.length * wordWeight, str2.length * wordWeight)
  return maxWeight === 0 ? 1 : 1 - distance / maxWeight
}
