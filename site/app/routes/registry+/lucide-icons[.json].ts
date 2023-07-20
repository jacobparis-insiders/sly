// http://localhost:3000/registry/lucide-icons.json
// https://sly-cli.fly.dev/registry/lucide-icons.json

import { json, type LoaderArgs } from "@remix-run/node"
import type { z } from "zod"
import { type libraryIndexSchema } from "../../schemas.js"

import { Octokit } from "octokit"

export const meta = {
  name: "lucide-icons",
  source: "https://github.com/lucide-icons/lucide/tree/main/icons",
  description:
    "Community-run fork of Feather Icons, open for anyone to contribute icons.",
  license: "https://github.com/lucide-icons/lucide/blob/main/LICENSE",
} as const

export async function loader({ request }: LoaderArgs) {
  const octokit = new Octokit()

  // get latest commit for directory path
  const latestCommit = await octokit.rest.repos.getCommit({
    owner: "lucide-icons",
    repo: "lucide",
    path: "icons",
    ref: "main",
  })

  // get tree for latest commit
  const tree = await octokit.rest.git.getTree({
    owner: "lucide-icons",
    repo: "lucide",
    tree_sha: latestCommit.data.sha,
    recursive: "true",
  })

  const files = tree.data.tree
    .filter((file) => {
      if (file.type !== "blob") return false
      if (!file.path) return false
      if (!file.path.endsWith(".svg")) return false
      if (!file.path.startsWith("icons/")) return false

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
    resources: files,
  })
}
