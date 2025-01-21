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
    let lineNumber = 1
    let hiddenLineCount = 0
    let isHiding = false
    let visibleContextLines = 0

    const pushCurrentLine = () => {
      if (currentLine.length > 0) {
        const isAllEqual = currentLine.every(
          (segment) => segment.type === "equal",
        )

        if (isAllEqual) {
          unchangedLineCount++

          if (unchangedLineCount > contextPadding * 2 && !isHiding) {
            // Start hiding lines
            isHiding = true
            hiddenLineCount = unchangedLineCount - contextPadding
            visibleContextLines = 0
            // Remove excess context lines, keeping only contextPadding lines
            currentChunk.splice(-contextPadding, contextPadding)
            currentChunk.push(
              <div
                key={`truncation-${chunkLineCount}`}
                className="flex px-4 text-neutral-400 border-t border-b border-neutral-100 bg-neutral-50"
              >
                <span className="inline-block w-[3ch] select-none">⋮</span>
                <span>⋮ {hiddenLineCount} lines hidden ⋮</span>
              </div>,
            )
          } else if (isHiding) {
            hiddenLineCount++
            // Update truncation message
            const lastElement = currentChunk[currentChunk.length - 1]
            if (React.isValidElement(lastElement)) {
              currentChunk[currentChunk.length - 1] = React.cloneElement(
                lastElement,
                {
                  ...lastElement.props,
                  children: [
                    lastElement.props.children[0],
                    <span key="count">⋮ {hiddenLineCount} lines hidden ⋮</span>,
                  ],
                },
              )
            }
          }
        } else {
          if (isHiding) {
            // End hiding and reset counters
            isHiding = false
            unchangedLineCount = 0
            hiddenLineCount = 0
            visibleContextLines = 0
          } else {
            unchangedLineCount = 0
          }
        }

        if (!isHiding) {
          if (isAllEqual) {
            // Show the line as it's within contextPadding
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
                <span className="inline-block w-[3ch] select-none">
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
            lineNumber++
          } else {
            // Changed line, always show
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
                <span className="inline-block w-[3ch] select-none">
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
            lineNumber++
          }
        }

        currentLine = []
        chunkLineCount++
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
        <div key={chunkIndex} className="w-full min-w-fit">
          {chunk}
        </div>
      ))}
    </pre>
  )
}
