// http://localhost:3000/registry/tailwindlabs/heroicons/heart-solid.json
// https://sly-cli.fly.dev/registry/tailwindlabs/heroicons/heart-solid.json

import { json, type LoaderFunctionArgs } from "@remix-run/node"
import { meta } from "./tailwindlabs.heroicons[.json].js"
import { type libraryItemWithContentSchema } from "../../schemas.js"
import type { z } from "zod"
import { getGithubFile } from "../../github.server.js"

export async function loader({ params }: LoaderFunctionArgs) {
  const dir = params.name?.endsWith("-outline") ? "outline" : "solid"
  const trimmedName = params.name
    ?.replace(/-outline$/, "")
    .replace(/-solid$/, "")

  const icon = await getGithubFile({
    owner: "tailwindlabs",
    repo: "heroicons",
    path: `optimized/24/${dir}/${trimmedName}.svg`,
    ref: "master",
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
