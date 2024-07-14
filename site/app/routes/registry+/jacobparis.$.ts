import { type LoaderFunctionArgs } from "@remix-run/node"
import cachified from "cachified"
import { cache } from "~/cache.server"
import {
  libraryItemWithContentSchema,
  type Meta,
  libraryIndexSchema,
} from "~/schemas"

export const meta = {
  name: "jacobparis/ui",
  source: "https://github.com/jacobparis-insiders/jacobparis.com",
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
