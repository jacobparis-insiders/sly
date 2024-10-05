// http://localhost:3000/registry/draft-ui.json
// https://sly-cli.fly.dev/registry/draft-ui.json

import { json, type LoaderFunctionArgs } from"react-router"
import type { z } from "zod"
import type { Meta, libraryIndexSchema } from "../../schemas.js"
import { getGithubDirectory } from "../../github.server.js"

export const meta = {
  name: "draft-ui",
  source: "https://draft-ui.com/",
  description:
    "Draft UI is a collection of simply designed React components focused on making web accessibility as easy as copy & paste.",
  license: "https://github.com/IHIutch/draft-ui",
  tags: ["ui"],
} as const satisfies Meta

export async function loader({ request }: LoaderFunctionArgs) {
  const files = await getGithubDirectory({
    owner: "IHIutch",
    repo: "draft-ui",
    path: "packages/ui/src",
    ref: "main",
  })

  const resources = files
    .filter((file) => {
      if (!file.path?.endsWith(".tsx")) return false

      return true
    })
    .map((file) => {
      if (!file.path) throw new Error("File path is undefined")

      return {
        name: file.path
          ?.replace(/^packages\/ui\/src\//, "")
          .replace(/\.tsx$/, ""),
      }
    })

  return json<z.input<typeof libraryIndexSchema>>({
    version: "1.0.0",
    meta,
    resources,
  })
}
