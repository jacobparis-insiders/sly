// http://localhost:3000/registry/remixicons.json
// https://sly-cli.fly.dev/registry/remixicons.json

import { json, type LoaderFunctionArgs } from "@remix-run/node"
import type { z } from "zod"
import type { Meta, libraryIndexSchema } from "../../schemas.js"
import { getGithubDirectory, getGithubIndex } from "../../github.server.js"

export const meta = {
  name: "remixicon",
  source: "https://remixicon.com/",
  description:
    "Remix Icon is a set of open-source neutral-style system symbols for designers and developers",
  license: "https://github.com/Remix-Design/RemixIcon/blob/master/License",
  tags: ["icons"],
} as const satisfies Meta

export async function loader({ request }: LoaderFunctionArgs) {
  const collections = await getGithubIndex({
    owner: "Remix-Design",
    repo: "RemixIcon",
    path: "icons",
    ref: "master",
  })

  const icons = await Promise.all(
    collections.map((collection) =>
      getGithubDirectory({
        owner: "Remix-Design",
        repo: "RemixIcon",
        path: collection,
        ref: "master",
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
                ?.replace(`icons/`, "")
                .toLowerCase()
                .replace(/\.svg$/, ""),
            }
          })
      )
    )
  )

  const resources = icons.flat().sort((a, b) => a.name.localeCompare(b.name))
  return json<z.input<typeof libraryIndexSchema>>({
    version: "1.0.0",
    meta,
    resources,
  })
}
