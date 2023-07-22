// http://localhost:3000/registry/lucide-icons.json
// https://sly-cli.fly.dev/registry/lucide-icons.json

import { json, type LoaderArgs } from "@remix-run/node"
import type { z } from "zod"
import { type libraryIndexSchema } from "../../schemas.js"
import { getGithubDirectory } from "../../github.server.js"

export const meta = {
  name: "lucide-icons",
  source: "https://github.com/lucide-icons/lucide/tree/main/icons",
  description:
    "Community-run fork of Feather Icons, open for anyone to contribute icons.",
  license: "https://github.com/lucide-icons/lucide/blob/main/LICENSE",
} as const

export async function loader({ request }: LoaderArgs) {
  const files = await getGithubDirectory({
    owner: "lucide-icons",
    repo: "lucide",
    path: "icons",
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
