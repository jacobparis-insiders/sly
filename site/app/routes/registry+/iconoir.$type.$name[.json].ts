// http://localhost:3000/registry/iconoir/globe.json
// https://sly-cli.fly.dev/registry/iconoir/globe.json

import { json, type LoaderArgs } from "@remix-run/node"
import { meta } from "./iconoir[.json].js"
import { type libraryItemWithContentSchema } from "../../schemas.js"
import type { z } from "zod"
import { getGithubFile } from "../../github.server.js"

export async function loader({ params }: LoaderArgs) {
  const icon = await getGithubFile({
    owner: "iconoir-icons",
    repo: "iconoir",
    path: `icons/${params.type}/${params.name}.svg`,
    ref: "main",
  })

  if (!icon) {
    throw new Response("Not found", { status: 404 })
  }

  if (!icon.download_url) {
    throw new Response("Not found", { status: 404 })
  }

  return json<z.input<typeof libraryItemWithContentSchema>>({
    name: icon.name.replace(/\.svg$/, ""),
    meta: {
      ...meta,
      source: icon.html_url ?? meta.source,
    },
    files: [
      {
        name: icon.name,
        content: [
          `<!-- ${meta.name} -->`,
          `<!-- ${meta.license} -->`,
          await fetch(icon.download_url).then((res) => res.text()),
        ].join("\n"),
      },
    ],
  })
}
