// http://localhost:3000/registry/@blueprintjs/icons/add.json
// https://sly-cli.fly.dev/registry/@blueprintjs/icons/add.json

import { json, type LoaderArgs } from "@remix-run/node"

import { meta } from "./@blueprintjs.icons[.json].js"
import { type libraryItemWithContentSchema } from "../../schemas.js"
import type { z } from "zod"
import { optimize } from "svgo";
import { getGithubFile } from "../../github.server.js"

export async function loader({ params }: LoaderArgs) {
  const file = await getGithubFile({
    owner: "palantir",
    repo: "blueprint",
    path: `resources/icons/16px/${params.name}.svg`,
    ref: "develop",
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
          await fetch(file.download_url).then((res) => res.text())
            .then(svg => optimize(svg, {
              plugins: [
                'preset-default',
                "removeUselessStrokeAndFill",
                {
                  name: 'removeAttrs',
                  params: {
                    attrs: 'fill'
                  }
                }
              ],
            }).data),
          ].join("\n"),
      },
    ],
  })
}
