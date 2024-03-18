// http://localhost:3000/icons

import type { LoaderFunctionArgs } from "@remix-run/node"
import { Link, useLoaderData } from "@remix-run/react"
import cachified from "cachified"
import { cache } from "~/cache.server"
import { useRootLoaderData } from "~/root"
import { registryIndexSchema } from "~/schemas"

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url)

  const registry = await cachified({
    key: "registry",
    cache,
    staleWhileRevalidate: 1000 * 60 * 60 * 12, // 2 hours
    ttl: 1000 * 60 * 60 * 12, // 1 hours
    async getFreshValue() {
      return fetch(url.origin + "/registry/index.json")
        .then((response) => response.json())
        .then((response) => registryIndexSchema.parseAsync(response))
    },
  })

  return {
    libraries: registry.libraries.filter((library) =>
      library.tags.includes("icons")
    ),
  }
}

export default function Index() {
  const { connectionId } = useRootLoaderData()
  const { libraries } = useLoaderData<typeof loader>()

  return (
    <div className="flex mx-auto max-w-5xl px-4 flex-col text-neutral-600">
      <h1 className="mt-16 font-bold text-3xl text-neutral-600">
        Icon libraries available on Sly
      </h1>

      <div className="flex flex-col gap-y-4 mt-4">
        {libraries.map((library) => (
          <Link
            to={`/icons/${library.name}`}
            key={library.name}
            className="block hover:bg-neutral-200 px-4 py-2 rounded-3xl"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex flex-col">
                  <span className="font-bold">{library.name}</span>
                  <span className="text-sm text-neutral-500">
                    {library.description}
                  </span>
                </div>
              </div>
              <div className="flex items-center">
                <span className="text-sm text-neutral-500">
                  {library.tags.join(", ")}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
