// http://localhost:3000/registry/remixicon/arrows/arrow-down-fill.json
// https://sly-cli.fly.dev/registry/remixicon/arrows/arrow-down-fill.json

import { json, type LoaderFunctionArgs } from"react-router"
import { meta } from "./remixicon[.json].js"
import { type libraryItemWithContentSchema } from "../../schemas.js"
import type { z } from "zod"
import { getGithubFile } from "../../github.server.js"

function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export async function loader({ params }: LoaderFunctionArgs) {
  const variant = params.variant?.split(" ").map(capitalize).join(" ")
  const icon = await getGithubFile({
    owner: "Remix-Design",
    repo: "RemixIcon",
    path: `icons/${variant}/${params.name}.svg`,
    ref: "master",
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
