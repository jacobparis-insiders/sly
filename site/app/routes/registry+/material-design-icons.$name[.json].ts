// http://localhost:3000/registry/material-design-icons/mobile_friendly-filled.json
// https://sly-cli.fly.dev/registry/material-design-icons/mobile_friendly-filled.json

import { json, type LoaderFunctionArgs } from"react-router"
import { meta } from "./material-design-icons[.json].js"
import { type libraryItemWithContentSchema } from "../../schemas.js"
import type { z } from "zod"
import { getGithubFile } from "../../github.server.js"

export async function loader({ params }: LoaderFunctionArgs) {
  if (!params.name) {
    throw new Response("Not found", { status: 404 })
  }

  const dir = params.name.endsWith("-filled")
    ? "filled"
    : params.name.endsWith("-outlined")
    ? "outlined"
    : params.name.endsWith("-round")
    ? "round"
    : params.name.endsWith("-sharp")
    ? "sharp"
    : params.name.endsWith("-two-tone")
    ? "two-tone"
    : ""

  const trimmedName = params.name
    .replace(/-filled$/, "")
    .replace(/-outlined$/, "")
    .replace(/-round$/, "")
    .replace(/-sharp$/, "")
    .replace(/-two-tone$/, "")

  const icon = await getGithubFile({
    owner: "marella",
    repo: "material-design-icons",
    path: `svg/${dir}/${trimmedName}.svg`,
    ref: "main",
  })

  if (!icon) {
    throw new Response("Not found", { status: 404 })
  }

  if (!icon.download_url) {
    throw new Response("Not found", { status: 404 })
  }

  return json<z.input<typeof libraryItemWithContentSchema>>({
    name: icon.name.replace(/\.svg$/, `-${dir}`),
    meta: {
      ...meta,
      source: icon.html_url ?? meta.source,
    },
    files: [
      {
        name: icon.name.replace(/\.svg$/, `-${dir}.svg`),
        content: [
          `<!-- ${meta.name} -->`,
          `<!-- ${meta.license} -->`,
          await fetch(icon.download_url).then((res) => res.text()),
        ].join("\n"),
      },
    ],
  })
}
