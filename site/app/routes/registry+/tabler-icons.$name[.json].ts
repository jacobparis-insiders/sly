// http://localhost:3000/registry/tabler-icons/12-hours.json
// https://sly-cli.fly.dev/registry/tabler-icons/12-hours.json

import { json, type LoaderFunctionArgs } from"react-router"
import { meta } from "./tabler-icons[.json].js"
import { type libraryItemWithContentSchema } from "../../schemas.js"
import type { z } from "zod"
import { getGithubFile } from "../../github.server.js"

export async function loader({ params }: LoaderFunctionArgs) {
  const variant = params.name?.endsWith("-outline") ? "outline" : "filled"
  const trimmedName = params.name
    ?.replace(/-outline$/, "")
    .replace(/-filled$/, "")

  const icon = await getGithubFile({
    owner: "tabler",
    repo: "tabler-icons",
    path: `icons/${variant}/${trimmedName}.svg`,
    ref: "main",
  })

  if (!icon) {
    throw new Response("Not found", { status: 404 })
  }

  if (!icon.download_url) {
    throw new Response("Not found", { status: 404 })
  }

  return json<z.input<typeof libraryItemWithContentSchema>>({
    name: icon.name.replace(/\.svg$/, `-${variant}`),
    meta: {
      ...meta,
      source: icon.html_url ?? meta.source,
    },
    files: [
      {
        name: icon.name.replace(/\.svg$/, `-${variant}.svg`),
        content: [
          `<!-- ${meta.name} -->`,
          `<!-- ${meta.license} -->`,
          await fetch(icon.download_url).then((res) => res.text()),
        ].join("\n"),
      },
    ],
  })
}
