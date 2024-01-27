// http://localhost:3000/registry/@radix-ui/icons.json
// https://sly-cli.fly.dev/registry/@radix-ui/icons.json

import { json, type LoaderFunctionArgs } from "@remix-run/node"
import type { z } from "zod"
import type { Meta, libraryIndexSchema } from "../../schemas.js"
import { getGithubDirectory } from "../../github.server.js"

export const meta = {
  name: "@radix-ui/icons",
  source:
    "https://github.com/radix-ui/icons/tree/master/packages/radix-icons/icons",
  description: "A crisp set of 15×15 icons designed by the WorkOS team.",
  license: "https://github.com/radix-ui/icons/blob/master/LICENSE",
  tags: ["icons"],
} as const satisfies Meta

export async function loader({ request }: LoaderFunctionArgs) {
  const files = await getGithubDirectory({
    owner: "radix-ui",
    repo: "icons",
    path: "packages/radix-icons/icons",
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
        name: file.path
          ?.replace(/^packages\/radix-icons\/icons\//, "")
          .replace(/\.svg$/, ""),
      }
    })

  return json<z.input<typeof libraryIndexSchema>>({
    version: "1.0.0",
    meta,
    resources,
  })
}
