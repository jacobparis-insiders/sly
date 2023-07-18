// http://localhost:3000/registry/index.json
// https://sly-cli.fly.dev/registry/index.json

import { json, type LoaderArgs } from "@remix-run/node"
import { z } from "zod"
import { meta as shadcnMeta } from "./@shadcn.ui[.json].js"
import { meta as radixMeta } from "./@radix-ui.icons[.json].js"
import { meta as lucideMeta } from "./lucide-icons[.json].js"
import { meta as transformersMeta } from "./@sly-cli.transformers[.json].js"

import { metaSchema } from "../../schemas.js"

const response = z.object({
  version: z.string(),
  libraries: z.array(metaSchema),
})

export async function loader({ request }: LoaderArgs) {
  return json<z.infer<typeof response>>({
    version: "1.0.0",
    libraries: [radixMeta, lucideMeta, shadcnMeta, transformersMeta],
  })
}
