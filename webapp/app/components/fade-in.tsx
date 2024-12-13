import { cn } from "#app/utils/misc.js"

export function FadeIn({
  show,
  delay = 0,
  children,
  className,
}: {
  show: boolean
  delay?: number
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "transition-opacity duration-300",
        show ? "opacity-100" : "opacity-0",
        className,
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}
