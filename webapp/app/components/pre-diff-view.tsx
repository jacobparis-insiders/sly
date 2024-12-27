import { ComponentProps, memo, useMemo } from "react"
import { cn } from "#app/utils/misc.js"

export const PreDiffViewWithTokens = memo(
  _PreDiffViewWithTokens,
  (prev, next) => {
    return prev.diffArray === next.diffArray
  },
)

function _PreDiffViewWithTokens({
  diffArray,
  className,
  ...props
}: {
  className?: string
  diffArray: Array<{
    type: string
    tokens: Array<{ value: string }>
  }>
} & ComponentProps<"pre">) {
  const CHUNK_SIZE = 200

  const memoizedChunks = useMemo(() => {
    const chunks = []
    let currentChunk = [] as Array<React.ReactNode>
    let currentType = null as string | null
    let currentText = ""

    const pushCurrentSpan = () => {
      if (currentText) {
        currentChunk.push(
          <span
            key={`${chunks.length}-${currentChunk.length}`}
            className={
              currentType === "equal"
                ? "text-neutral-500"
                : currentType === "insert"
                  ? "text-green-600"
                  : currentType === "delete"
                    ? "text-red-600"
                    : "text-blue-600"
            }
          >
            {currentText}
          </span>,
        )
        currentText = ""
      }
    }

    diffArray.forEach((part) => {
      part.tokens.forEach((token) => {
        const text = token.value.replaceAll("\t", "  ")

        if (part.type !== currentType) {
          pushCurrentSpan()
          currentType = part.type
        }

        currentText += text

        if (currentChunk.length >= CHUNK_SIZE) {
          chunks.push(currentChunk)
          currentChunk = []
        }
      })
    })

    pushCurrentSpan()
    if (currentChunk.length > 0) {
      chunks.push(currentChunk)
    }

    return chunks
  }, [diffArray])

  return (
    <pre {...props} className={cn("overflow-auto", className)}>
      {memoizedChunks.map((chunk, chunkIndex) => (
        <div key={chunkIndex}>{chunk}</div>
      ))}
    </pre>
  )
}
