import { type LoaderFunctionArgs } from"react-router"
import cachified from "@epic-web/cachified"
import {
  libraryItemWithContentSchema,
  type Meta,
  libraryIndexSchema,
} from "#app/schemas.js"
import { cache } from "#app/cache.server.js"

export const meta = {
  name: "jacobparis/ui",
  source: "https://www.jacobparis.com/ui",
  description: "UI components, compatible with shadcn/ui design systems.",
  license: "https://github.com/jacobparis-insiders/jacobparis.com",
  tags: ["ui"],
} as const satisfies Meta

export async function loader({ params }: LoaderFunctionArgs) {
  let slug = params["*"]
  if (!slug?.endsWith(".json")) {
    throw new Response(null, { status: 404, statusText: "Not Found" })
  }

  if (slug === "ui.json") {
    return cachified({
      key: `jacobparis/${slug}`,
      cache: cache,
      forceFresh: true,
      checkValue: libraryIndexSchema,
      getFreshValue: async () => {
        // handle root index / and specific items
        return fetch(`http://www.jacobparis.com/registry/${slug}`).then(
          (response) => response.json()
        )
      },
    })
  }

  if (slug.startsWith("ui/")) {
    return cachified({
      key: `jacobparis/${slug}`,
      cache: cache,
      forceFresh: true,
      checkValue: libraryItemWithContentSchema,
      getFreshValue: async () => {
        return fetch(`http://www.jacobparis.com/registry/${slug}`).then(
          (response) => response.json()
        )
      },
    })
  }

  throw new Response(null, { status: 404, statusText: "Not Found" })
}
