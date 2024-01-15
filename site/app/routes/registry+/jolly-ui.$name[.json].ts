// http://localhost:3000/registry/jolly-ui/avatar.json
// https://sly-cli.fly.dev/registry/jolly-ui/avatar.json

import { json, type LoaderFunctionArgs } from "@remix-run/node"
import { meta } from "./jolly-ui[.json].js"
import { z } from "zod"
import type { libraryItemWithContentSchema } from "../../schemas.js"
import { cache } from "../../cache.server.js"
import cachified from "cachified"
const jollyFile = z.object({
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
    key: `jolly-ui/registry/styles/default/${params.name}.json`,
    cache: cache,
    staleWhileRevalidate: 1000 * 60 * 60, // 1 hour
    ttl: 1000 * 60 * 60, // 1 hour
    checkValue: jollyFile,
    async getFreshValue() {
      console.log(`Cache miss for jolly-ui/${params.name}`)
      return fetch(
        `https://jollyui.dev/registry/styles/default/${params.name}.json`
      ).then((res) => res.json())
    },
  })

  return json<z.input<typeof libraryItemWithContentSchema>>({
    name: component.name,
    meta: {
      ...meta,
      source: `https://api.github.com/repos/jolly-ui/apps/docs/registry/default/ui/${params.name}.tsx`,
    },
    dependencies: component.dependencies ?? [],
    registryDependencies: component.registryDependencies ?? [],
    files: component.files.map((file) => ({
      name: file.name,
      content: file.content,
    })),
  })
}
