// http://localhost:3000/registry/just/array-flatten.json
// https://sly-cli.fly.dev/registry/just/array-flatten.json

import { json, type LoaderFunctionArgs } from "@remix-run/node"

import { meta } from "./just[.json].js"
import { type libraryItemWithContentSchema } from "../../schemas.js"
import type { z } from "zod"
import { getGithubFile } from "../../github.server.js"

export async function loader({ params }: LoaderFunctionArgs) {
  const file = await getGithubFile({
    owner: "angus-c",
    repo: "just",
    path: `packages/${params.name}/index.mjs`,
    ref: "master",
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
