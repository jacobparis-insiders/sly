// http://localhost:3000/registry/jolly-ui.json
// https://sly-cli.fly.dev/registry/jolly-ui.json

import { json, type LoaderFunctionArgs } from "@remix-run/node"
import cachified from "cachified"
import { z } from "zod"
import { cache } from "~/cache.server"
import type { libraryIndexSchema } from "~/schemas"

export const jollyFile = z.object({
  name: z.string(),
  dependencies: z.array(z.string()).default([]),
  registryDependencies: z.array(z.string()).default([]),
  files: z.array(z.string()).default([]),
  type: z.string(),
})

export const meta = {
  name: "jolly-ui",
  source: "https://github.com/jolbol1/shadcn-aria",
  description:
    "shadcn/ui compatible react aria components that you can copy and paste into your apps. Accessible. Customizable. Open Source.",
  license: "https://github.com/jolbol1/shadcn-aria/blob/main/LICENSE.md",
} as const

export async function loader({ request }: LoaderFunctionArgs) {
  const jolly = await cachified({
    key: "jolly-ui/registry",
    cache: cache,
    staleWhileRevalidate: 1000 * 60 * 60, // 1 hour
    ttl: 1000 * 60 * 60, // 1 hour
    checkValue: z.array(jollyFile),
    async getFreshValue() {
      console.log(`Cache miss for jolly-ui/registry`)
      return fetch("https://jollyui.dev/registry").then((res) => res.json())
    },
  })

  const icons = jolly.map((component) => ({
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
