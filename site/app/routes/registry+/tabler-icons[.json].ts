// http://localhost:3000/registry/tabler-icons/icons.json
// https://sly-cli.fly.dev/registry/tabler-icons/icons.json

import { json, type LoaderFunctionArgs } from "@remix-run/node"
import type { z } from "zod"
import { type libraryIndexSchema } from "../../schemas.js"
import { getGithubDirectory } from "../../github.server.js"

export const meta = {
  name: "tabler-icons",
  source: "https://github.com/tabler/tabler-icons/tree/master/icons",
  description: "A set of over 4800 free MIT-licensed high-quality SVG icons.",
  license: "https://github.com/tabler/tabler-icons/blob/master/LICENSE",
} as const

export async function loader({ request }: LoaderFunctionArgs) {
  const files = await getGithubDirectory({
    owner: "tabler",
    repo: "tabler-icons",
    path: "icons",
    ref: "master",
  })

  const resources = files
    .filter((file) => {
      if (!file.path?.endsWith(".svg")) return false

      return true
    })
    .map((file) => {
      if (!file.path) throw new Error("File path is undefined")

      return {
        name: file.path?.replace(/^icons\//, "").replace(/\.svg$/, ""),
      }
    })

  return json<z.input<typeof libraryIndexSchema>>({
    version: "1.0.0",
    meta,
    resources,
  })
}
