// http://localhost:3000/registry/draft-ui/breadcrumbs.json
// https://sly-cli.fly.dev/registry/draft-ui/breadcrumbs.json

import { json, type LoaderFunctionArgs } from"react-router"

import { meta } from "./draft-ui[.json]"
import { type libraryItemWithContentSchema } from "../../schemas.js"
import type { z } from "zod"
import { getGithubFile } from "../../github.server.js"

export async function loader({ params }: LoaderFunctionArgs) {
  const file = await getGithubFile({
    owner: "IHIutch",
    repo: "draft-ui",
    path: `packages/ui/src/${params.name}.tsx`,
    ref: "main",
  });

  if (!file) {
    throw new Response("Not found", { status: 404 })
  }

  if (!file.download_url) {
    throw new Response("Not found", { status: 404 })
  }

  return json<z.input<typeof libraryItemWithContentSchema>>({
    name: file.name,
    meta: {
      ...meta,
      source: file.html_url ?? meta.source,
    },
    files: [
      {
        name: file.name,
        content: [
          `// ${meta.name}`,
          `// ${meta.license}`,
          await fetch(file.download_url).then((res) => res.text()),
        ].join("\n"),
      },
    ],
  })
}
