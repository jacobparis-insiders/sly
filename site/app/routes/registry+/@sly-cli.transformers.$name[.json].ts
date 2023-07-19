// http://localhost:3000/registry/@sly-cli/transformers/ts-prettier.json
// https://sly-cli.fly.dev/registry/@sly-cli/transformers/ts-prettier.json

import { json, type LoaderArgs } from "@remix-run/node"

import { meta, transformers } from "./@sly-cli.transformers[.json].js"
import type { libraryItemWithContentSchema } from "../../schemas.js"
import type { z } from "zod"

export async function loader({ params }: LoaderArgs) {
  const transformer = transformers.find((t) => t.name === params.name)

  if (!transformer) {
    throw new Response("Not found", { status: 404 })
  }

  return json<z.infer<typeof libraryItemWithContentSchema>>({
    name: transformer.name,
    meta,
    dependencies: transformer.dependencies,
    devDependencies: transformer.devDependencies,
    registryDependencies: transformer.registryDependencies,
    files: transformer.files.map((file) => ({
      name: file.name,
      content: file.content,
    })),
  })
}
