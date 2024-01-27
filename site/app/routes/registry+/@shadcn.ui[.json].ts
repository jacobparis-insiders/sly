// http://localhost:3000/registry/@shadcn/ui.json
// https://sly-cli.fly.dev/registry/@shadcn/ui.json

import { json, type LoaderFunctionArgs } from "@remix-run/node"
import cachified from "cachified"
import { z } from "zod"
import { cache } from "../../cache.server"
import type { libraryIndexSchema, Meta } from "../../schemas"

export const shadcnFile = z.object({
  name: z.string(),
  dependencies: z.array(z.string()).default([]),
  registryDependencies: z.array(z.string()).default([]),
  files: z.array(z.string()).default([]),
  type: z.string(),
})

export const meta = {
  name: "@shadcn/ui",
  source: "https://github.com/shadcn/ui",
  description:
    "Beautifully designed components that you can copy and paste into your apps.",
  license: "https://github.com/shadcn/ui/blob/main/LICENSE.md",
  tags: ["ui"],
} as const satisfies Meta

export async function loader({ request }: LoaderFunctionArgs) {
  const shadcn = await cachified({
    key: "shadcn/registry",
    cache: cache,
    staleWhileRevalidate: 1000 * 60 * 60, // 1 hour
    ttl: 1000 * 60 * 60, // 1 hour
    checkValue: z.array(shadcnFile),
    async getFreshValue() {
      console.log(`Cache miss for shadcn/registry`)
      return fetch("https://ui.shadcn.com/registry").then((res) => res.json())
    },
  })

  const icons = shadcn.map((component) => ({
    name: component.name,
    dependencies: component.dependencies,
    registryDependencies: component.registryDependencies,
  }))

  return json<z.input<typeof libraryIndexSchema>>({
    version: "1.0.0",
    meta,
    resources: icons,
  })
}
