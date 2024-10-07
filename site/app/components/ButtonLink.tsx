import { useRef } from "react"
import { HoverEffect } from "./HoverEffect"
import { Link, LinkProps } from "react-router"

export function ButtonLink({ children, ...props }: LinkProps) {
  const elementRef = useRef<HTMLAnchorElement>(null)

  return (
    <Link
      ref={elementRef}
      {...props}
      className={`translate-0 group relative ${props.className}`}
    >
      <HoverEffect elementRef={elementRef} />
      {children}
    </Link>
  )
}
