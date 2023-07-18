// http://localhost:3000/registry/@shadcn/ui/avatar.json
// https://sly-cli.fly.dev/registry/@shadcn/ui/avatar.json

import { json, type LoaderArgs } from "@remix-run/node"
import { meta } from "./@shadcn.ui[.json].js"
import { githubFile } from "../../github.server.js"

export async function loader({ params }: LoaderArgs) {
  const icon = await fetch(
    `https://api.github.com/repos/shadcn/ui/contents/apps/www/registry/default/ui/${params.name}.tsx`
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
