// http://localhost:3000/registry/index.json
// https://sly-cli.fly.dev/registry/index.json

import type { z } from "zod"
import { meta as shadcnMeta } from "./@shadcn.ui[.json].js"
import { meta as jollyUiMeta } from "./jolly-ui[.json].js"
import { meta as iconoirMeta } from "./iconoir[.json].js"
import { meta as radixMeta } from "./@radix-ui.icons[.json].js"
import { meta as lucideMeta } from "./lucide-icons[.json].js"
import { meta as transformersMeta } from "./@sly-cli.transformers[.json].js"
import { meta as simpleIconsMeta } from "./simple-icons[.json].js"
import { meta as heroiconsMeta } from "./tailwindlabs.heroicons[.json].js"
import { meta as blueprintIconsMeta } from "./@blueprintjs.icons[.json].js"
import { meta as phosphorIconsMeta } from "./phosphor-icons[.json].js"
import { meta as tablerIconsMeta } from "./tabler-icons[.json].js"
import { meta as materialDesignIconsMeta } from "./material-design-icons[.json].js"
import { meta as draftUiMeta } from "./draft-ui[.json].js"
import { meta as justMeta } from "./just[.json].js"
import { meta as jacobparisUiMeta } from "./jacobparis.$.js"
import { meta as remixiconMeta } from "./remixicon[.json].js"

import type { registryIndexSchema } from "../../schemas.js"
import cachified from "@epic-web/cachified"
import { cache } from "../../cache.server.js"
import { npmSchema } from "../../schemas.js"
import { json } from "react-router"

export async function loader() {
  const npm = await cachified({
    key: `npm/@sly-cli/sly`,
    cache,
    staleWhileRevalidate: 1000 * 60 * 60 * 12, // 12 hours
    ttl: 1000 * 60 * 60 * 12, // 12 hours
    async getFreshValue() {
      return fetch("https://registry.npmjs.org/@sly-cli/sly")
        .then((response) => response.json())
        .then((response) => npmSchema.parseAsync(response))
    },
  })

  return json<z.input<typeof registryIndexSchema>>({
    version: npm["dist-tags"].latest,
    libraries: [
      blueprintIconsMeta,
      draftUiMeta,
      heroiconsMeta,
      iconoirMeta,
      jacobparisUiMeta,
      jollyUiMeta,
      justMeta,
      lucideMeta,
      materialDesignIconsMeta,
      phosphorIconsMeta,
      radixMeta,
      remixiconMeta,
      shadcnMeta,
      simpleIconsMeta,
      tablerIconsMeta,
      transformersMeta,
    ],
  })
}
