// http://localhost:3000/registry/@radix-ui/icons/accessibility.json
// https://sly-cli.fly.dev/registry/@radix-ui/icons/accessibility.json

import { json, type LoaderFunctionArgs } from"react-router"

import { meta } from "./@radix-ui.icons[.json].js"
import { type libraryItemWithContentSchema } from "../../schemas.js"
import type { z } from "zod"
import { getGithubFile } from "../../github.server.js"

export async function loader({ params }: LoaderFunctionArgs) {
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
        content: [
          `<!-- ${meta.name} -->`,
          `<!-- ${meta.license} -->`,
          await fetch(file.download_url).then((res) => res.text()),
        ].join("\n"),
      },
    ],
  })
}
