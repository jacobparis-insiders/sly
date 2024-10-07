// http://localhost:3000/registry/iconoir.json
// https://sly-cli.fly.dev/registry/iconoir.json

import { json, type LoaderFunctionArgs } from"react-router"
import type { z } from "zod"
import type { Meta, libraryIndexSchema } from "../../schemas.js"
import { getGithubDirectory } from "../../github.server.js"

export const meta = {
  name: "iconoir",
  source: "https://iconoir.com/",
  description: "An open source icons library with 1300+ icons.",
  license: "https://github.com/iconoir-icons/iconoir/blob/main/LICENSE",
  tags: ["icons"],
} as const satisfies Meta

export async function loader({ request }: LoaderFunctionArgs) {
  const files = await getGithubDirectory({
    owner: "iconoir-icons",
    repo: "iconoir",
    path: "icons",
    ref: "main",
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
