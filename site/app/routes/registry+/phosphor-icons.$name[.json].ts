// http://localhost:3000/registry/phosphor-icons/alarm-duotone.json
// https://sly-cli.fly.dev/registry/phosphor-icons/alarm-duotone.json

import { json, type LoaderFunctionArgs } from"react-router"
import { meta } from "./phosphor-icons[.json].js"
import { type libraryItemWithContentSchema } from "../../schemas.js"
import type { z } from "zod"
import { getGithubFile } from "../../github.server.js"

export async function loader({ params }: LoaderFunctionArgs) {
  const variant = params.name?.split("-").pop()
  if (!variant) {
    throw new Response("Not found", { status: 404 })
  }

  const icon = await getGithubFile({
    owner: "phosphor-icons",
    repo: "core",
    path: `assets/${variant}/${params.name}.svg`,
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
