// http://localhost:3000/icons

import type { LoaderFunctionArgs } from "@remix-run/node"
import { Link, useLoaderData } from "@remix-run/react"
import cachified from "cachified"
import { cache } from "~/cache.server"
import { getValueFromCookie } from "~/misc"
import { configSchema, registryIndexSchema } from "~/schemas"

export async function loader({ request }: LoaderFunctionArgs) {
  const connectionId = getValueFromCookie(
    request.headers.get("Cookie"),
    "connectionId"
  )

  if (!connectionId) {
    return {
      activeLibraries: [],
      inactiveLibraries: [],
    }
  }

  const config = await fetch(
    `http://0.0.0.0:1999/parties/cli/${connectionId}?type=config`,
    {
      method: "GET",
    }
  )
    .then((response) => response.json())
    .then((data) => configSchema.parseAsync(data))

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

  const libraries = registry.libraries.map((library) => {
    const configLibrary = config.libraries.find((l) => l.name === library.name)

    if (configLibrary) {
      return {
        ...library,
        isActive: true,
        directory: configLibrary?.directory ?? "",
        transformers: configLibrary?.transformers ?? [],
        postinstall: configLibrary?.postinstall ?? [],
      }
    } else {
      return {
        ...library,
        isActive: false,
      }
    }
  })

  const activeLibraries = registry.libraries
    .filter((library) => config.libraries.find((l) => l.name === library.name))
    .map((library) => {
      const configLibrary = config.libraries.find(
        (l) => l.name === library.name
      )

      return {
        ...library,
        isActive: true as const,
        directory: configLibrary?.directory ?? "",
        transformers: configLibrary?.transformers ?? [],
        postinstall: configLibrary?.postinstall ?? [],
      }
    })

  const inactiveLibraries = registry.libraries
    .filter((library) => !config.libraries.find((l) => l.name === library.name))
    .map((library) => {
      return {
        ...library,
        isActive: false as const,
      }
    })

  return {
    activeLibraries,
    inactiveLibraries,
  }
}

export default function Config() {
  const { activeLibraries, inactiveLibraries } = useLoaderData<typeof loader>()
  return (
    <div className="flex mx-auto max-w-5xl px-4 flex-col">
      <h1 className="mt-16 font-bold text-3xl">Libraries</h1>

      <div className="flex flex-col gap-y-4 mt-4">
        {activeLibraries.map((library) => (
          <LibraryRow library={library} key={library.name} />
        ))}

        <h2 className="mt-8 font-bold text-xl"> Add more </h2>

        {inactiveLibraries.map((library) => (
          <LibraryRow library={library} key={library.name} />
        ))}
      </div>
    </div>
  )
}

function LibraryRow({ library }) {
  return (
    <div className="block hover:bg-neutral-200 px-4 py-2 rounded-3xl">
      <div className="flex items-center justify-between">
        <div className="flex flex-col ">
          <span className="font-bold">{library.name}</span>
          <span className="text-sm text-neutral-500">
            {library.description}
          </span>
          {library.isActive ? (
            <div>
              <span className="text-sm text-neutral-500">
                Installs to {library.directory}
              </span>
              <span className="text-sm text-neutral-500">
                {library.transformers.join(", ")}
              </span>
              <span className="text-sm text-neutral-500">
                {library.postinstall.join(", ")}
              </span>
            </div>
          ) : null}
        </div>
        <div className="px-4">
          {library.isActive ? (
            <Link to={`/icons/${library.name}`}>
              <span className="text-sm text-neutral-500">Edit</span>
            </Link>
          ) : (
            <button className="text-sm text-neutral-500">Add</button>
          )}
        </div>
      </div>
    </div>
  )
}
