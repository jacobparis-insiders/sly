import { useLoaderData } from "@remix-run/react"
import { getIconifyIndex } from "../../../lib/iconify.js"
import type { BreadcrumbHandle } from "#app/components/ui/breadcrumbs.js"
import { IconLibraryCard } from "#app/components/icon-library-card.tsx"

export const handle: BreadcrumbHandle = {
  breadcrumb: "iconify",
}

export async function clientLoader() {
  const iconifyCollections = await getIconifyIndex()

  const libraries = Object.entries(iconifyCollections).map(([key, lib]) => ({
    id: key,
    name: lib.name,
    type: lib.category || "General",
    total: lib.total,
    author: lib.author.name,
    license: lib.license.title,
    samples: lib.samples,
    registryUrl: `https://icon-sets.iconify.design/${key}/`,
  }))

  return { libraries }
}

export default function Explore() {
  const { libraries } = useLoaderData<typeof clientLoader>()

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Icon Libraries</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {libraries.map((lib) => (
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
