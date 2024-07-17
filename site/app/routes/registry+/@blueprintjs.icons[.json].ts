// http://localhost:3000/registry/@blueprintjs/icons.json
// https://sly-cli.fly.dev/registry/@blueprintjs/icons.json

import { json, type LoaderFunctionArgs } from "@remix-run/node"
import type { z } from "zod"
import type { Meta, libraryIndexSchema } from "../../schemas.js"
import { getGithubDirectory } from "../../github.server.js"

export const meta = {
  name: "@blueprintjs/icons",
  source: "https://blueprintjs.com/docs/#icons/icons-list",
  description: "Blueprint is a React UI toolkit for the web.",
  license: "https://github.com/palantir/blueprint/blob/develop/LICENSE",
  tags: ["icons"],
} as const satisfies Meta

export async function loader({ request }: LoaderFunctionArgs) {
  // TODO: include 20px icons?
  const files = await getGithubDirectory({
    owner: "palantir",
    repo: "blueprint",
    path: "resources/icons/16px",
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
        name: file.path
          ?.replace(/^resources\/icons\/16px\//, "")
          .replace(/\.svg$/, ""),
      }
    })

  return json<z.input<typeof libraryIndexSchema>>({
    version: "1.0.0",
    meta,
    resources,
  })
}
