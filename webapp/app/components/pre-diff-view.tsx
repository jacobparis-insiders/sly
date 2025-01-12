import { ComponentProps, memo, useMemo } from "react"
import { cn } from "#app/utils/misc.js"
import React from "react"

export const PreDiffViewWithTokens = memo(
  _PreDiffViewWithTokens,
  (prev, next) => {
    return prev.diffArray === next.diffArray
  },
)

function _PreDiffViewWithTokens({
  diffArray,
  className,
  contextPadding = 2,
  ...props
}: {
  className?: string
  contextPadding?: number
  diffArray: Array<{
    type: string
    tokens: Array<{ value: string }>
  }>
} & ComponentProps<"pre">) {
  const memoizedChunks = useMemo(() => {
    const chunks = []
    let currentChunk = [] as Array<React.ReactNode>
    let chunkLineCount = 0
    let currentLine = [] as Array<{ type: string; text: string }>
    let unchangedLineCount = 0
    let lastChangedLineIndex = -1
    let lineNumber = 1
    let hiddenLineCount = 0
    let isHidingLines = false

    const pushCurrentLine = () => {
      if (currentLine.length > 0) {
        const isAllEqual = currentLine.every(
          (segment) => segment.type === "equal",
        )

        if (!isAllEqual) {
          lastChangedLineIndex = chunkLineCount
          unchangedLineCount = 0
        } else {
          unchangedLineCount++
        }

        const shouldShowLine =
          !isAllEqual ||
          chunkLineCount <= lastChangedLineIndex + contextPadding ||
          unchangedLineCount <= contextPadding

        if (!shouldShowLine && unchangedLineCount > contextPadding * 2) {
          hiddenLineCount++
          isHidingLines = true
          lineNumber++
        } else {
          if (isHidingLines) {
            currentChunk.push(
              <div
                key={`truncation-${chunkLineCount}`}
                className="flex px-4 text-neutral-400 border-t border-b border-neutral-100 bg-neutral-50"
              >
                <span className="inline-block w-[3ch] mr-4 select-none">⋮</span>
                <span>⋮ {hiddenLineCount} lines hidden ⋮</span>
              </div>,
            )
            isHidingLines = false
            hiddenLineCount = 0
          }

          if (shouldShowLine) {
            currentChunk.push(
              <div
                key={`line-${chunkLineCount}`}
                className={cn("flex whitespace-pre px-4", {
                  "bg-green-50 text-green-600": currentLine.every(
                    (s) => s.type === "insert",
                  ),
                  "bg-red-50 text-red-600": currentLine.every(
                    (s) => s.type === "delete",
                  ),
                })}
              >
                <span className="inline-block w-[3ch] mr-4 select-none">
                  {lineNumber}
                </span>
                <span className={cn("flex-1")}>
                  {currentLine.map((segment, i) => (
                    <span
                      key={i}
                      className={
                        segment.type === "equal"
                          ? "text-neutral-400"
                          : segment.type === "insert"
                            ? "bg-green-50 text-green-600"
                            : "bg-red-50 text-red-600"
                      }
                    >
                      {segment.text}
                    </span>
                  ))}
                </span>
              </div>,
            )
          }

          lineNumber++
          currentLine = []
          chunkLineCount++
        }
      }
    }

    diffArray.forEach((part) => {
      part.tokens.forEach((token) => {
        const text = token.value.replaceAll("\t", "  ")
        const lines = text.split("\n")

        lines.forEach((line, index) => {
          if (line) {
            currentLine.push({ type: part.type, text: line })
          }

          if (index < lines.length - 1) {
            pushCurrentLine()

            if (text.includes("\n\n")) {
              if (currentChunk.length > 0) {
                chunks.push(currentChunk)
                currentChunk = []
                chunkLineCount = 0
              }
            }
          }
        })
      })
    })

    pushCurrentLine()
    if (currentChunk.length > 0) {
      chunks.push(currentChunk)
    }

    return chunks
  }, [diffArray, contextPadding])

  return (
    <pre {...props} className={cn("overflow-auto font-mono", className)}>
      {memoizedChunks.map((chunk, chunkIndex) => (
        <div key={chunkIndex}>{chunk}</div>
      ))}
    </pre>
  )
}
