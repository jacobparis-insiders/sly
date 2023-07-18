// http://localhost:3000/registry/lucide-icons.json
// https://sly-cli.fly.dev/registry/lucide-icons.json

import { json, type LoaderArgs } from "@remix-run/node"
import { githubFile } from "../../github.server.js"
import { z } from "zod"

export const meta = {
  name: "lucide-icons",
  source:
    "https://github.com/radix-ui/icons/tree/master/packages/radix-icons/icons",
  description:
    "Community-run fork of Feather Icons, open for anyone to contribute icons.",
  license: "https://github.com/radix-ui/icons/blob/master/LICENSE",
} as const

export async function loader({ request }: LoaderArgs) {
  const lucide = await fetch(
    "https://api.github.com/repos/lucide-icons/lucide/contents/icons"
  )
    .then((res) => res.json())
    .then(z.array(githubFile).parseAsync)

  const icons = lucide
    .filter((icon) => {
      if (icon.type !== "file") return false
      if (!icon.path.endsWith(".svg")) return false

      return true
    })
    .map((icon) => ({
      name: icon.name.replace(/\.svg$/, ""),
      url: icon.download_url,
    }))

  return json({
    version: "1.0.0",
    meta,
    resources: icons,
  })
}
