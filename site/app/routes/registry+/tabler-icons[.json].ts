// http://localhost:3000/registry/tabler-icons/icons.json
// https://sly-cli.fly.dev/registry/tabler-icons/icons.json

import { json, type LoaderFunctionArgs } from "@remix-run/node"
import type { z } from "zod"
import type { Meta, libraryIndexSchema } from "../../schemas.js"
import { getGithubDirectory } from "../../github.server.js"

export const meta = {
  name: "tabler-icons",
  source: "https://github.com/tabler/tabler-icons/tree/main/icons",
  description: "A set of over 4800 free MIT-licensed high-quality SVG icons.",
  license: "https://github.com/tabler/tabler-icons/blob/main/LICENSE",
  tags: ["icons"],
} as const satisfies Meta

export async function loader({ request }: LoaderFunctionArgs) {
  const whenOutlines = getGithubDirectory({
    owner: "tabler",
    repo: "tabler-icons",
    path: "icons/outline",
    ref: "main",
  }).then((resources) =>
    resources
      .filter((file) => {
        if (!file.path?.endsWith(".svg")) return false

        return true
      })
      .map((file) => {
        if (!file.path) throw new Error("File path is undefined")

        return {
          name: file.path
            ?.replace(/^icons\/outline\//, "")
            .replace(/\.svg$/, "-outline"),
        }
      })
  )

  const whenFilled = getGithubDirectory({
    owner: "tabler",
    repo: "tabler-icons",
    path: "icons/filled",
    ref: "main",
  }).then((resources) =>
    resources
      .filter((file) => {
        if (!file.path?.endsWith(".svg")) return false

        return true
      })
      .map((file) => {
        if (!file.path) throw new Error("File path is undefined")

        return {
          name: file.path
            ?.replace(/^icons\/filled\//, "")
            .replace(/\.svg$/, "-filled"),
        }
      })
  )

  const resources = [...(await whenOutlines), ...(await whenFilled)].sort(
    (a, b) => a.name.localeCompare(b.name)
  )
  return json<z.input<typeof libraryIndexSchema>>({
    version: "1.0.0",
    meta,
    resources,
  })
}
