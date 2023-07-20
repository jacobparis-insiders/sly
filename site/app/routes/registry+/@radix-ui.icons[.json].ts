// http://localhost:3000/registry/@radix-ui/icons.json
// https://sly-cli.fly.dev/registry/@radix-ui/icons.json

import { json, type LoaderArgs } from "@remix-run/node"
import { z } from "zod"
import { githubFile, type libraryIndexSchema } from "../../schemas.js"

export const meta = {
  name: "@radix-ui/icons",
  source:
    "https://github.com/radix-ui/icons/tree/master/packages/radix-icons/icons",
  description: "A crisp set of 15×15 icons designed by the WorkOS team.",
  license: "https://github.com/radix-ui/icons/blob/master/LICENSE",
} as const

export async function loader({ request }: LoaderArgs) {
  const radix = await fetch(
    "https://api.github.com/repos/radix-ui/icons/contents/packages/radix-icons/icons"
  )
    .then((res) => res.json())
    .then(z.array(githubFile).parseAsync)

  const icons = radix
    .filter((icon) => {
      if (icon.type !== "file") return false
      if (!icon.path.endsWith(".svg")) return false

      return true
    })
    .map((icon) => ({
      name: icon.name.replace(/\.svg$/, ""),
    }))

  return json<z.input<typeof libraryIndexSchema>>({
    version: "1.0.0",
    meta,
    resources: icons,
  })
}
