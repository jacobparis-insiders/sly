import { cn } from "#app/utils/misc.js"

export function Terminal({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "bg-black rounded-lg font-mono px-6 py-4 text-white max-w-prose w-full text-left relative",
        className,
      )}
    >
      {children}
    </div>
  )
}
