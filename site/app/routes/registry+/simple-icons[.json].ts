// http://localhost:3000/registry/simple-icons.json
// https://sly-cli.fly.dev/registry/simple-icons.json

import { json, type LoaderFunctionArgs } from"react-router"
import type { z } from "zod"
import type { Meta, libraryIndexSchema } from "../../schemas.js"
import { getGithubDirectory } from "../../github.server.js"

export const meta = {
  name: "simple-icons",
  source: "https://simpleicons.org/",
  description: "Over 2500 Free SVG icons for popular brands",
  license:
    "https://github.com/simple-icons/simple-icons/blob/develop/LICENSE.md",
  tags: ["icons"],
} as const satisfies Meta

export async function loader({ request }: LoaderFunctionArgs) {
  const files = await getGithubDirectory({
    owner: "simple-icons",
    repo: "simple-icons",
    path: "icons",
    ref: "develop",
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
