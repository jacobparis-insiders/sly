import { useLoaderData } from "@remix-run/react"
import { getIconifyIndex } from "../../../lib/iconify.js"
import type { BreadcrumbHandle } from "#app/components/ui/breadcrumbs.js"
import { IconLibraryCard } from "#app/components/icon-library-card.tsx"
import { ComponentLibraryCard } from "#app/components/component-library-card.tsx"
import { db } from "#app/db.js"

export const handle: BreadcrumbHandle = {
  breadcrumb: "Explore",
}

export async function clientLoader() {
  const componentLibraries = db.libraries
  const iconifyCollections = await getIconifyIndex()

  const iconLibraries = Object.entries(iconifyCollections).map(
    ([key, lib]) => ({
      id: key,
      name: lib.name,
      type: lib.category || "General",
      total: lib.total,
      author: lib.author.name,
      license: lib.license.title,
      samples: lib.samples,
      registryUrl: `https://icon-sets.iconify.design/${key}/`,
    }),
  )

  return { iconLibraries, componentLibraries }
}

export default function Explore() {
  const { iconLibraries, componentLibraries } =
    useLoaderData<typeof clientLoader>()

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Component Libraries</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {componentLibraries.map((lib) => (
          <ComponentLibraryCard
            key={lib.id}
            library={lib.id}
            lib={{
              type: "component",
              name: lib.name,
              items: {},
              registryUrl: lib.registryUrl,
            }}
          />
        ))}
      </div>

      <h2 className="text-2xl font-bold mb-4">Icon Libraries</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {iconLibraries.map((lib) => (
          <IconLibraryCard
            key={lib.id}
            id={lib.id}
            name={lib.name}
            total={lib.total}
            author={lib.author}
            samples={lib.samples}
          />
        ))}
      </div>
    </div>
  )
}
