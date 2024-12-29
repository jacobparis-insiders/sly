import { cn } from "#app/utils/misc.js"
import type { Button } from "./ui/button"
import { Icon as IconifyIcon } from "@iconify/react"

export function IconifyThumbnail({
  libraryId,
  name,
  isSelected,
  ...props
}: {
  libraryId: string
  name: string
  isSelected: boolean
} & Omit<React.ComponentProps<"button">, "type">) {
  return (
    <div key={name} className="flex flex-col items-center">
      <button
        type="button"
        className={cn(
          "rounded-lg border border-border bg-card text-card-foreground shadow-smooth py-4 cursor-default flex flex-col items-center justify-center",
          "relative shadow-smooth z-10 w-full text-5xl aspect-square h-auto",
          isSelected
            ? "border-green-400 bg-green-50 dark:bg-green-900/20 hover:border-green-500 text-green-500"
            : "hover:bg-neutral-50 hover:border-neutral-300",
        )}
        {...props}
        aria-pressed={isSelected}
        aria-label={`${name} icon`}
        aria-describedby={`${name}-label`}
      >
        <IconifyIcon icon={`${libraryId}:${name}`} />
        <span className="sr-only">
          {isSelected ? "Selected" : "Unselected"}
        </span>
      </button>
      <span id={`${name}-label`} className="text-sm font-mono text-center">
        {name}
      </span>
    </div>
  )
}
