import { type IconName } from "#app/components/icons/icons.ts"
import href from "#app/components/icons/sprite.svg"
import { cn } from "#app/utils/misc.js"

export function Icon({
  name,
  className,
  ...props
}: React.SVGProps<SVGSVGElement> & {
  name: IconName
}) {
  return (
    <svg {...props} className={cn("inline self-center size-4", className)}>
      <use href={`${href}#${name}`} />
    </svg>
  )
}
