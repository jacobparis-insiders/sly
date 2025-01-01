import { type LoaderFunctionArgs } from "@remix-run/node"
import { Outlet } from "@remix-run/react"
import { invariant } from "@epic-web/invariant"
import { BreadcrumbHandle } from "#app/components/ui/breadcrumbs.js"

export const handle: BreadcrumbHandle = {
  breadcrumb: " ",
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { owner, repo } = params
  invariant(owner, "No owner found in params")
  invariant(repo, "No repo found in params")

  return {
    breadcrumbLabel: `${owner}/${repo}`,
  }
}

export default Outlet
