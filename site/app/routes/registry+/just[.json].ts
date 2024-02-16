// http://localhost:3000/registry/just.json
// https://sly-cli.fly.dev/registry/just.json

import { json, type LoaderFunctionArgs } from "@remix-run/node"
import type { z } from "zod"
import type { Meta, libraryIndexSchema } from "../../schemas.js"
import { getGithubDirectory } from "../../github.server.js"

export const meta = {
  name: "just",
  source: "https://github.com/angus-c/just",
  description:
    "A library of dependency-free JavaScript utilities that do just one thing.",
  license: "https://github.com/angus-c/just",
  tags: ["utilities"],
} as const satisfies Meta

export async function loader({ request, params }: LoaderFunctionArgs) {
  const files = await getGithubDirectory({
    owner: "angus-c",
    repo: "just",
    path: "packages",
    ref: "master",
  })

  const resources = files
    .filter((file) => {
      if (!file.path?.endsWith("index.mjs")) return false

      return true
    })
    .map((file) => {
      if (!file.path) throw new Error("File path is undefined")

      const regex = /packages\/([^\/]+)\//;
      const match = file.path.match(regex);
      return {
        name: match ? match[1] : 'unknown'
      }
    })

  return json<z.input<typeof libraryIndexSchema>>({
    version: "1.0.0",
    meta,
    resources,
  })
}
