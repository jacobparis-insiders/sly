// http://localhost:3000/registry/tailwindlabs/heroicons.json
// https://sly-cli.fly.dev/registry/tailwindlabs/heroicons.json

import { json, type LoaderArgs } from "@remix-run/node"
import type { z } from "zod"
import { type libraryIndexSchema } from "../../schemas.js"
import { getGithubDirectory } from "../../github.server.js"

export const meta = {
  name: "tailwindlabs/heroicons",
  source: "https://github.com/tailwindlabs/heroicons/tree/develop/icons",
  description:
    "Beautiful hand-crafted SVG icons, by the makers of Tailwind CSS.",
  license: "https://github.com/tailwindlabs/heroicons/blob/master/LICENSE",
} as const

export async function loader({ request }: LoaderArgs) {
  const outlines = await getGithubDirectory({
    owner: "tailwindlabs",
    repo: "heroicons",
    path: "src/24/outline",
    ref: "master",
  })

  const outlinedResources = outlines
    .filter((file) => {
      if (!file.path?.endsWith(".svg")) return false

      return true
    })
    .map((file) => {
      if (!file.path) throw new Error("File path is undefined")

      return {
        name: file.path
          ?.replace(/^src\/24\/outline\//, "")
          .replace(/\.svg$/, "-outline"),
      }
    })

  const solids = await getGithubDirectory({
    owner: "tailwindlabs",
    repo: "heroicons",
    path: "src/24/solid",
    ref: "master",
  })

  const solidResources = solids
    .filter((file) => {
      if (!file.path?.endsWith(".svg")) return false

      return true
    })
    .map((file) => {
      if (!file.path) throw new Error("File path is undefined")

      return {
        name: file.path
          ?.replace(/^src\/24\/solid\//, "")
          .replace(/\.svg$/, "-solid"),
      }
    })

  const resources = [...outlinedResources, ...solidResources].sort((a, b) =>
    a.name.localeCompare(b.name)
  )
  return json<z.input<typeof libraryIndexSchema>>({
    version: "1.0.0",
    meta,
    resources,
  })
}
