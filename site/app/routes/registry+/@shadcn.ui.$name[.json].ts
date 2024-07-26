// http://localhost:3000/registry/@shadcn/ui/avatar.json
// https://sly-cli.fly.dev/registry/@shadcn/ui/avatar.json

import { json, type LoaderFunctionArgs } from "@remix-run/node"
import { meta } from "./@shadcn.ui[.json].js"
import { z } from "zod"
import type { libraryItemWithContentSchema } from "../../schemas.js"
import { cache } from "../../cache.server.js"
import cachified from "@epic-web/cachified"
const shadcnFile = z.object({
  name: z.string(),
  dependencies: z.array(z.string()).optional(),
  registryDependencies: z.array(z.string()).optional(),
  files: z
    .array(z.object({ name: z.string(), content: z.string() }))
    .default([]),
  type: z.string(),
})

export async function loader({ params }: LoaderFunctionArgs) {
  const component = await cachified({
    key: `shadcn/registry/styles/default/${params.name}.json`,
    cache: cache,
    staleWhileRevalidate: 1000 * 60 * 60, // 1 hour
    ttl: 1000 * 60 * 60, // 1 hour
    checkValue: shadcnFile,
    async getFreshValue() {
      console.log(`Cache miss for shadcn/${params.name}`)
      return fetch(
        `https://ui.shadcn.com/registry/styles/default/${params.name}.json`
      ).then((res) => res.json())
    },
  })

  return json<z.input<typeof libraryItemWithContentSchema>>({
    name: component.name,
    meta: {
      ...meta,
      source: `https://api.github.com/repos/shadcn/ui/contents/apps/www/registry/default/ui/${params.name}.tsx`,
    },
    dependencies: component.dependencies ?? [],
    registryDependencies: component.registryDependencies ?? [],
    files: component.files.map((file) => ({
      name: file.name,
      content: file.content,
    })),
  })
}
