import detectIndent from "detect-indent"
import { Diff, Hunk } from "./Diff.js"

export function correctJsonPatch(
  patchText: string,
  targetFileContent: string,
  options: { excludeKeys?: Array<string> } = {}
) {
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

  diff.hunks = diff.hunks.flatMap((hunk) => {
    const rootHunk = new Hunk(hunk.startLinePreEdit, hunk.startLinePostEdit, [])
    const extraHunks: Array<typeof rootHunk> = []

    let i = 0
    const batch = []
    while (i < hunk.lines.length) {
      if (hunk.lines[i]?.type === "retain" || hunk.lines[i]?.type === "add") {
        let foundActionableLine = false
        const batchStartIndex = i
        let lastRetainBeforeActionable

        for (; i < hunk.lines.length; i++) {
          if (hunk.lines[i].type === "remove") {
            break
          }

          if (hunk.lines[i].type === "add") {
            foundActionableLine = true
            if (lastRetainBeforeActionable) {
              batch.push(lastRetainBeforeActionable)
              lastRetainBeforeActionable = undefined
            }
            batch.push(hunk.lines[i])
          }

          if (hunk.lines[i].type === "retain") {
            if (!foundActionableLine) {
              lastRetainBeforeActionable = hunk.lines[i]
            } else {
              batch.push(hunk.lines[i])
            }
          }
        }

        if (batch.length > 0 && foundActionableLine) {
          const newHunk = new Hunk(
            hunk.startLinePreEdit + batchStartIndex,
            hunk.startLinePostEdit + batchStartIndex,
            []
          )
          newHunk.addLines(batch)
          extraHunks.push(newHunk)

          if (batch.at(-1)?.type === "retain") {
            batch.splice(0, batch.length - 1)
          } else {
            batch.length = 0
          }
        }
      }

      if (hunk.lines[i]?.type === "remove") {
        const batchStartIndex = i

        const kvMatch =
          // "key": "value",
          hunk.lines[i]?.content.match(
            /^\s*"(?<key>[^"]*)"\s*:\s*"?(?<value>[^"]*)"?,?$/
          ) ||
          // "key": ["value1", "value2"],
          hunk.lines[i]?.content.match(
            /^\s*"(?<key>[^"]*)"\s*:\s*(?<value>\[[^\]]*\]),?$/
          )

        if (!kvMatch || !kvMatch.groups) {
          batch.push(hunk.lines[i])
          i++
          continue
        } else {
          let foundMatchingPair = false
          const key = kvMatch.groups.key
          const value = kvMatch.groups.value
          for (let j = i; j < hunk.lines.length; j++) {
            if (hunk.lines[j].type === "add") {
              // TODO: I need an adult
              const kvMatch =
                // must have same indent as the original line
                (hunk.lines[i]?.content.match(/^\s*/)?.[0] ===
                  hunk.lines[j]?.content.match(/^\s*/)?.[0] &&
                  // "key": "value",
                  hunk.lines[j]?.content.match(
                    /^\s*"(?<key>[^"]*)"\s*:\s*"?(?<value>[^"]*)"?,?$/
                  )) ||
                // "key": ["value1", "value2"],
                (hunk.lines[i]?.content.match(/^\s*/)?.[0] ===
                  hunk.lines[j]?.content.match(/^\s*/)?.[0] &&
                  hunk.lines[j]?.content.match(
                    /^\s*"(?<key>[^"]*)"\s*:\s*(?<value>\[[^\]]*\]),?$/
                  ))

              if (kvMatch && kvMatch.groups?.key === key) {
                if (kvMatch.groups?.value === value) {
                  break
                }
                foundMatchingPair = true
                // add/remove pairs get their own batch
                batch.length = 0
                batch.push(hunk.lines[i])

                if (kvMatch.groups?.value.endsWith("{")) {
                  let linesToDelete = 1
                  for (let k = j; k < hunk.lines.length; k++) {
                    batch.push(hunk.lines[k])
                    linesToDelete++

                    if (
                      hunk.lines[k].type === "add" &&
                      (hunk.lines[k].content.endsWith("}") ||
                        hunk.lines[k].content.endsWith("},"))
                    ) {
                      break
                    }
                  }

                  hunk.lines.splice(j, linesToDelete)
                } else {
                  batch.push(hunk.lines[j])
                  hunk.lines.splice(j, 1)
                }

                if (options?.excludeKeys?.includes(key)) {
                  batch.length = 0
                }
                break
              }
            }
          }

          if (!foundMatchingPair) {
            // there's no add with the same key, so just add this to the batch
            batch.push(hunk.lines[i])
            i++
            continue
          }
        }

        if (batch.length > 0) {
          const newHunk = new Hunk(
            hunk.startLinePreEdit + batchStartIndex,
            hunk.startLinePostEdit + batchStartIndex,
            []
          )
          newHunk.addLines(batch)
          extraHunks.push(newHunk)

          if (batch.at(-1)?.type === "retain") {
            batch.splice(0, batch.length - 1)
          } else {
            batch.length = 0
          }
        }
      }

      i++
    }

    return rootHunk.lines.length > 0 ? [rootHunk, ...extraHunks] : extraHunks
  })

  for (const hunk of diff.hunks) {
    let foundMatch = false
    for (let lineNumber = 0; lineNumber < hunk.lines.length; lineNumber++) {
      const hunkLine = hunk.lines[lineNumber].content
      const key = hunkLine.split(":")[0]
      if (!key) continue

      // this is called a spiral search
      for (let index = 0; index <= Object.keys(linesDict).length * 2; index++) {
        const i = index % 2 === 0 ? index / 2 : -(Math.floor(index / 2) + 1)
        const adjustedStartLine = hunk.startLinePreEdit + i
        if (adjustedStartLine < 0) continue
        if (!linesDict[adjustedStartLine]) continue

        // must have the same indent
        const dictKey = linesDict[adjustedStartLine].split(":")[0]
        if (dictKey === key) {
          hunk.startLinePreEdit = adjustedStartLine - 1
          hunk.startLinePostEdit += i - 1
          foundMatch = true
          break
        }
      }

      if (foundMatch) break
    }

    let hunkInd = hunk.lines.length
    while (hunkInd >= 0) {
      const line = hunk.lines[hunkInd]
      if (!line) {
        hunkInd--
        continue
      }

      const kvMatch =
        // "key": "value",
        line.content.match(
          /^\s*"(?<key>[^"]*)"\s*:\s*"?(?<value>[^"]*)"?,?$/
        ) ||
        // "key": ["value1", "value2"],
        line.content.match(/^\s*"(?<key>[^"]*)"\s*:\s*(?<value>\[[^\]]*\]),?$/)

      if (!kvMatch || !kvMatch.groups) {
        hunkInd--
        continue
      }

      const lineKey = kvMatch.groups.key
      const lineValue = kvMatch.groups.value

      const linesWithSameKey = Object.values(linesDict).filter((content) =>
        hasKey(lineKey, content)
      )

      let lineWithSameKey: string | undefined
      if (linesWithSameKey.length > 1) {
        // is there one with a matching indent level?
        lineWithSameKey = linesWithSameKey.find((content) => {
          const indent = content.match(/^\s*/)?.[0]
          return indent && content.startsWith(`${indent}"${lineKey}":`)
        })

        if (!lineWithSameKey) {
          // Don't know what to do about these
          hunkInd--
          continue
        }
      } else {
        lineWithSameKey = linesWithSameKey[0]
      }

      // traverse in reverse to deal with adds first
      if (line.type === "add") {
        // if (!lineWithSameKey) {
        //   hunkInd--
        //   continue
        // }

        // find out if there's a remove that matches the key
        const previousLine = hunk.lines[hunkInd - 1]
        let matchingRemove =
          previousLine &&
          previousLine.type === "remove" &&
          hasKey(lineKey, previousLine.content)
            ? previousLine
            : undefined
        // if (matchingRemove) {
        //   hunk.lines[hunkInd - 1].type = "retain"
        //   hunk.categoryCounts.retain++
        //   hunk.categoryCounts.remove--
        //   hunk.popLine(line, hunkInd)
        //   hunkInd--
        //   continue
        // }

        // if the line is already present in the file, retain it

        if (lineWithSameKey && hasValue(lineValue, lineWithSameKey)) {
          line.content = lineWithSameKey
          line.type = "retain"
          hunk.categoryCounts.retain++
          hunk.categoryCounts.add--

          if (matchingRemove) {
            hunk.popLine(matchingRemove, hunk.lines.indexOf(matchingRemove))
            hunkInd--

            matchingRemove = undefined
          }

          hunkInd--
          continue
        }

        if (!lineWithSameKey) {
          if (matchingRemove) {
            hunk.popLine(line, hunkInd)
            matchingRemove = undefined
          }
          hunkInd--
          continue
        }

        // if there is, update the remove to match the file
        if (matchingRemove) {
          matchingRemove.content = lineWithSameKey
          // update indent for other one
          line.content = line.content.replace(
            /^\s*/,
            lineWithSameKey.match(/^\s*/)?.[0] || ""
          )
        }
      }

      if (line.type === "remove") {
        // if we're removing a key that doesn't exist in the file, remove it
        if (!lineWithSameKey) {
          hunk.popLine(line, hunkInd)

          continue
        }
      }

      hunkInd--
    }

    hunkInd = 0

    // now traverse forward and see if there's any adds next to retains that can be retained
    while (hunkInd < hunk.lines.length) {
      const line = hunk.lines[hunkInd]
      if (line.type === "retain") {
        // check if the content matches the linesDict
        let linesDictIndex = 0
        for (const [key, content] of Object.entries(linesDict)) {
          if (content === line.content) {
            linesDictIndex = Number(key)
            break
          }
        }

        if (!linesDictIndex) {
          hunkInd++
          continue
        }

        const nextLine = hunk.lines[hunkInd + 1]
        if (
          nextLine &&
          nextLine.type === "add" &&
          linesDict[linesDictIndex + 1] === nextLine.content
        ) {
          nextLine.type = "retain"
        }
      }
      hunkInd++
    }
  }

  diff.hunks = diff.hunks.filter(
    (hunk) => hunk.startLinePostEdit < Object.keys(linesDict).length
  )

  diff.hunks.sort((a, b) => a.startLinePreEdit - b.startLinePreEdit)

  const printedDiff = diff.toString().trim() + "\n"
  return printedDiff.includes("@@") ? printedDiff : null
}

function hasKey(key: string, content: string): boolean {
  const match = content.match(/^\s*"([^"]+)"/)
  return Boolean(match && match[1] === key)
}

function hasValue(value: string, content: string): boolean {
  const match =
    // "key": "value",
    content.match(/^\s*"[^"]*"\s*:\s*["'`]?(?<value>[^"']*)["'`]?,?$/) ||
    // "key": ["value1", "value2"],
    content.match(/^\s*"[^"]*"\s*:\s*(?<value>\[[^\]]*\]),?$/)
  return Boolean(
    match && match.groups?.value.replace("^", "") === value.replace("^", "")
  )
}
