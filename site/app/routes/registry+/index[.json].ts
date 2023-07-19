// http://localhost:3000/registry/index.json
// https://sly-cli.fly.dev/registry/index.json

import { json, type LoaderArgs } from "@remix-run/node"
import type { z } from "zod"
import { meta as shadcnMeta } from "./@shadcn.ui[.json].js"
import { meta as radixMeta } from "./@radix-ui.icons[.json].js"
import { meta as lucideMeta } from "./lucide-icons[.json].js"
import { meta as transformersMeta } from "./@sly-cli.transformers[.json].js"

import type { registryIndexSchema } from "../../schemas.js"

export async function loader({ request }: LoaderArgs) {
  return json<z.infer<typeof registryIndexSchema>>({
    version: "1.0.0",
    libraries: [radixMeta, lucideMeta, shadcnMeta, transformersMeta],
  })
}
