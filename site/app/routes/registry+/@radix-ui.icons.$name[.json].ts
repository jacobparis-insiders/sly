// http://localhost:3000/registry/@radix-ui/icons/accessibility.json
// https://sly-cli.fly.dev/registry/@radix-ui/icons/accessibility.json

import { json, type LoaderArgs } from "@remix-run/node"

import { meta } from "./@radix-ui.icons[.json].js"
import { type libraryItemWithContentSchema } from "../../schemas.js"
import type { z } from "zod"
import { getGithubFile } from "../../github.server.js"

export async function loader({ params }: LoaderArgs) {
  const file = await getGithubFile({
    owner: "radix-ui",
    repo: "icons",
    path: `packages/radix-icons/icons/${params.name}.svg`,
    ref: "master",
  })

  if (!file) {
    throw new Response("Not found", { status: 404 })
  }

  if (!file.download_url) {
    throw new Response("Not found", { status: 404 })
  }

  return json<z.input<typeof libraryItemWithContentSchema>>({
    name: file.name.replace(/\.svg$/, ""),
    meta: {
      ...meta,
      source: file.html_url ?? meta.source,
    },
    files: [
      {
        name: file.name,
        content: await fetch(file.download_url).then((res) => res.text()),
      },
    ],
  })
}
