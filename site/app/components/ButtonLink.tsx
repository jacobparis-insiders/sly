import { useRef } from "react"
import { HoverEffect } from "./HoverEffect"
import type { LinkProps } from "@remix-run/react"
import { Link } from "@remix-run/react"

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
