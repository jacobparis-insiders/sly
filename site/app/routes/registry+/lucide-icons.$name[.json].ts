// http://localhost:3000/registry/lucide-icons/accessibility.json
// https://sly-cli.fly.dev/registry/lucide-icons/accessibility.json

import { json, type LoaderArgs } from "@remix-run/node"
import { meta } from "./lucide-icons[.json].js"
import { githubFile, type libraryItemWithContentSchema } from "../../schemas.js"
import type { z } from "zod"

export async function loader({ params }: LoaderArgs) {
  const icon = await fetch(
    `https://api.github.com/repos/lucide-icons/lucide/contents/icons/${params.name}.svg`
  )
    .then((res) => res.json())
    .then(githubFile.parseAsync)

  return json<z.infer<typeof libraryItemWithContentSchema>>({
    name: icon.name.replace(/\.svg$/, ""),
    meta: {
      ...meta,
      source: icon.html_url,
    },
    dependencies: [],
    devDependencies: [],
    registryDependencies: [],
    files: [
      {
        name: icon.name,
        content: await fetch(icon.download_url).then((res) => res.text()),
      },
    ],
  })
}
