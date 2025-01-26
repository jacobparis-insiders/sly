import type { LoaderFunctionArgs } from "@remix-run/node"
import { invariant } from "@epic-web/invariant"
import { getIconifyLibraryIndex } from "../../../lib/iconify.js"
import { cachified, lru } from "#app/cache.server.js"
import type { BreadcrumbHandle } from "#app/components/ui/breadcrumbs.js"

export const handle: BreadcrumbHandle = {
  breadcrumb: " ",
}

export async function loader({ params, request }: LoaderFunctionArgs) {
  const libraryId = params.libraryId
  invariant(libraryId, "Library ID is required")

  const icons = await cachified({
    cache: lru,
    key: `iconify-library-index-${libraryId}-icons`,
    forceFresh: true,
    async getFreshValue() {
      const result = await getIconifyLibraryIndex(libraryId)

      if ("icons" in result) {
        throw new Error("Icons not found")
      }

      const icons = {
        icons: [
          ...(result.uncategorized || []),
          ...Object.values(result.categories || {}).flat(),
        ],
        totalItems: result.total,
      }

      return icons
    },
  })

  return Response.json({
    resources: icons.icons,
    totalItems: icons.totalItems,
  })
}
