import { BreadcrumbHandle } from "#app/components/ui/breadcrumbs.js"
import { Outlet } from "@remix-run/react"

export const handle: BreadcrumbHandle = {
  breadcrumb: "github",
}

export default Outlet
