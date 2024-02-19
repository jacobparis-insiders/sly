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

  const itemMeta = {
    ...meta,
    license: `https://github.com/angus-c/just/blob/master/packages/${params.name}/LICENSE`,
    source: `https://github.com/angus-c/just/tree/master/packages/${params.name}/index.mjs`,
  }
    
  return json<z.input<typeof libraryItemWithContentSchema>>({
    name: file.name,
    meta: itemMeta,
    files: [
      {
        name: `${params.name}.mjs`,
        content: [
          `// just/${params.name}`,
          `// ${itemMeta.license}`,
          await fetch(file.download_url).then((res) => res.text()),
        ].join("\n"),
      },
    ],
  })
}
