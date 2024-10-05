// http://localhost:3000/registry/lucide-icons.json
// https://sly-cli.fly.dev/registry/lucide-icons.json

import { json, type LoaderFunctionArgs } from"react-router"
import type { z } from "zod"
import type { Meta, libraryIndexSchema } from "../../schemas.js"
import { getGithubDirectory } from "../../github.server.js"

export const meta = {
  name: "lucide-icons",
  source: "https://lucide.dev/icons/",
  description:
    "Community-run fork of Feather Icons, open for anyone to contribute icons.",
  license: "https://github.com/lucide-icons/lucide/blob/main/LICENSE",
  tags: ["icons"],
} as const satisfies Meta

export async function loader({ request }: LoaderFunctionArgs) {
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
