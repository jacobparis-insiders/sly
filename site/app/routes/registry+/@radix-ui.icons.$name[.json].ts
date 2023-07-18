// http://localhost:3000/registry/@radix-ui/icons/accessibility.json
// https://sly-cli.fly.dev/registry/@radix-ui/icons/accessibility.json

import { json, type LoaderArgs } from "@remix-run/node"
import { githubFile } from "../../github.server.js"

import { meta } from "./@radix-ui.icons[.json].js"

export async function loader({ params }: LoaderArgs) {
  const icon = await fetch(
    `https://api.github.com/repos/radix-ui/icons/contents/packages/radix-icons/icons/${params.name}.svg`
  )
    .then((res) => res.json())
    .then(githubFile.parseAsync)

  return json({
    name: icon.name.replace(/\.svg$/, ""),
    meta: {
      ...meta,
      source: icon.html_url,
    },
    url: icon.download_url,
    files: [
      {
        name: icon.name,
        content: await fetch(icon.download_url).then((res) => res.text()),
      },
    ],
  })
}
