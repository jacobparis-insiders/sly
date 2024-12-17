import { ComponentProps, useState } from "react"
import { patienceDiff } from "#app/utils/diff.js"
import { ChevronDown, ChevronRight } from "lucide-react"
import { Button } from "#app/components/ui/button.tsx"
import { cn } from "#app/utils/misc.js"
import { processCollapsibleDiff } from "#app/utils/process-collapsible-diff.js"

export function PreDiffView({
  baseContent,
  changedContent,
  diffExtracted = false,
  collapsed = false,
  className,
  ...props
}: {
  className?: string
  baseContent: string
  diffExtracted?: boolean
  changedContent: string
  collapsed?: boolean
} & ComponentProps<"pre">) {
  const diff = patienceDiff(
    baseContent.split("\n"),
    changedContent.split("\n"),
  ).lines.map((part) =>
    part.bIndex === -1
      ? `- ${part.line}`
      : part.aIndex === -1
        ? `+ ${part.line}`
        : `  ${part.line}`,
  )

  const isExactMatch = diff.every(
    (line) => !line.startsWith("+") && !line.startsWith("-"),
  )
  const sections = isExactMatch ? [] : processCollapsibleDiff(diff)

  // Initialize collapse state for each section
  const [collapsedSections, setCollapsedSections] = useState(
    sections.map(() => true),
  )

  // Initialize inclusion state for each changed section with null for indeterminate
  const [includedSections, setIncludedSections] = useState<(boolean | null)[]>(
    sections.map(() => null),
  )

  const toggleCollapse = (index: number) => {
    setCollapsedSections((prev) =>
      prev.map((collapsed, i) => (i === index ? !collapsed : collapsed)),
    )
  }

  const toggleInclusion = (index: number) => {
    setIncludedSections((prev) =>
      prev.map((included, i) => (i === index ? false : included)),
    )
  }

  const [prevDiffExtracted, setPrevDiffExtracted] = useState(diffExtracted)
  if (diffExtracted !== prevDiffExtracted) {
    setPrevDiffExtracted(diffExtracted)
    setIncludedSections(sections.map(() => null))
  }

  return (
    <pre {...props} className={cn("overflow-auto", className)}>
      {sections.map((section, sectionIndex) => {
        if (section.type === "changed") {
          return (
            <div key={sectionIndex} className="relative">
              {diffExtracted ? (
                <div className="absolute -top-2 right-2 flex gap-2">
                  <Button
                    size="sm"
                    className=" bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200"
                    onClick={() => toggleInclusion(sectionIndex)}
                  >
                    No
                  </Button>
                </div>
              ) : null}
              {section.lines.map((line, lineIndex) => {
                const inclusionState = includedSections[sectionIndex]
                if (inclusionState === false) {
                  // If not included, hide green additions and turn red ones into unchanged
                  return line.startsWith("+") ? null : (
                    <Line
                      key={lineIndex}
                      line={" " + line.slice(1)}
                      diffExtracted={diffExtracted}
                    />
                  )
                }
                // Default behavior: show all lines
                return (
                  <Line
                    key={lineIndex}
                    line={line}
                    diffExtracted={diffExtracted}
                  />
                )
              })}
            </div>
          )
        }

        if (section.lines.length < 4 || !collapsed) {
          return section.lines.map((line, lineIndex) => (
            <Line key={lineIndex} line={line} diffExtracted={diffExtracted} />
          ))
        }

        return (
          <div key={sectionIndex}>
            <button
              onClick={() => toggleCollapse(sectionIndex)}
              className={cn(
                "flex items-center gap-2 text-neutral-500 bg-neutral-200/50  w-full",
                diffExtracted
                  ? "opacity-30"
                  : "hover:text-neutral-700 hover:bg-neutral-200/70",
              )}
              disabled={diffExtracted}
            >
              {collapsedSections[sectionIndex] ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
              {section.lines.length} unchanged lines
            </button>

            {!collapsedSections[sectionIndex] &&
              section.lines.map((line, lineIndex) => (
                <Line
                  key={lineIndex}
                  line={line}
                  diffExtracted={false}
                  className="bg-neutral-200/50"
                />
              ))}
          </div>
        )
      })}
    </pre>
  )
}

export function SimpleDiffView({
  baseContent,
  changedContent,
  className,
  ...props
}: {
  className?: string
  baseContent: string
  changedContent: string
} & ComponentProps<"pre">) {
  const baseLines = baseContent.split("\n")
  const changedLines = changedContent.split("\n")
  const baseLinesPre = baseLines.slice(0, changedLines.length)
  const baseLinesPost = baseLines.slice(changedLines.length)

  const diff = patienceDiff(baseLinesPre, changedLines).lines.map((part) =>
    part.bIndex === -1
      ? `- ${part.line}`
      : part.aIndex === -1
        ? `+ ${part.line}`
        : `  ${part.line}`,
  )

  return (
    <pre {...props} className={cn("overflow-auto", className)}>
      {diff.map((line, index) => (
        <Line key={index} line={line} />
      ))}
      {baseLinesPost.map((line, index) => (
        <Line key={index} line={line} />
      ))}
    </pre>
  )
}

export function Line({
  line,
  diffExtracted = false,
  className,
}: {
  line: string
  diffExtracted?: boolean
  className?: string
}) {
  return (
    <div
      className={cn(
        "px-4 transition-all duration-100 ",
        {
          "text-green-600 dark:text-green-600 bg-green-500/5":
            line.startsWith("+") && !diffExtracted,
          "text-green-600 dark:text-green-600 bg-green-500/10":
            line.startsWith("+") && diffExtracted,

          "text-red-600 dark:text-red-600 bg-red-500/5":
            line.startsWith("-") && !diffExtracted,
          "text-red-600 dark:text-red-600 bg-red-500/10":
            line.startsWith("-") && diffExtracted,

          "opacity-30":
            diffExtracted && !line.startsWith("+") && !line.startsWith("-"),
        },
        className,
      )}
      style={{ whiteSpace: "pre-wrap" }}
    >
      {line}
    </div>
  )
}
