import { cn } from "#app/utils/misc.js"

export function Heading({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <h2 className={cn("text-2xl mb-4 drop-shadow-smooth", className)}>
      {children}
    </h2>
  )
}
