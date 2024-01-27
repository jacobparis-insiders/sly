import { type SVGProps } from "react"
import { type IconName } from "./icons/names"
import href from "./icons/sprite.svg"

export function Icon({
  name,
  className,
  children,
  ...props
}: SVGProps<SVGSVGElement> & {
  name: IconName
}) {
  if (children) {
    return (
      <span className="inline-flex gap-x-2">
        <Icon name={name} className={className} {...props} />
        {children}
      </span>
    )
  }
  return (
    <svg {...props} className={`inline self-center ${className}`}>
      <use href={`${href}#${name}`} />
    </svg>
  )
}
