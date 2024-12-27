import {
  ClientLoaderFunctionArgs,
  Link,
  useLoaderData,
  useNavigate,
} from "@remix-run/react"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "#app/components/ui/card.tsx"
import { Icon as IconifyIcon } from "@iconify/react"
import { ComponentLibraryCard } from "#app/components/component-library-card.js"
import { fetchConfig, useCliInfo, useOptionalCli } from "#app/use-connection.js"
import { FadeIn } from "#app/components/fade-in.js"
import { Icon } from "#app/components/icon.js"
import { ConnectedTerminal, Terminal } from "#app/components/terminal.js"
import { db } from "#app/db.js"
import { getIconifyIndex } from "../../../lib/iconify"
import { cachified } from "#app/cache.server.js"
import { LoaderFunctionArgs } from "@vercel/remix"

// Add type for library items
type LibraryItem = {
  key: string
  type: "component" | "icon"
  name: string
  items: Record<string, unknown>
  registryUrl?: string
  author?: string
}

const packageTypes = [
  {
    type: "component",
    title: "Components",
    description: "Browse component libraries",
    link: "/component",
  },
  {
    type: "icon",
    title: "Icons",
    description: "Browse Iconify libraries",
    link: "/iconify",
  },
  {
    type: "repo",
    title: "Repositories",
    description: "Add another repo as a library",
    link: "/github",
  },
  {
    type: "gist",
    title: "Gists",
    description: "Add someone's Gists as a library",
    link: "/gist",
  },
  {
    type: "commit",
    title: "Commits",
    description: "Adapt a commit to your project",
    link: "/commit",
  },
  {
    type: "pr",
    title: "Pull Requests",
    description: "Import a whole PR",
    link: "/pr",
  },
]

export async function loader({ request }: LoaderFunctionArgs) {
  const { value: config } = await fetchConfig(request)
  const iconifyCollections = await cachified({
    key: "iconify-index",
    async getFreshValue() {
      return getIconifyIndex()
    },
  })

  // Create a set to track unique library keys
  const uniqueLibraryKeys = new Set<string>()

  // Combine and de-duplicate libraries
  const libraries = [
    ...(config?.libraries ? Object.entries(config.libraries) : []),
    ...db.libraries.map((lib) => [lib.id, lib]),
  ]
    .filter(([libraryKey]) => {
      if (uniqueLibraryKeys.has(libraryKey)) {
        return false
      }
      uniqueLibraryKeys.add(libraryKey)
      return true
    })
    .map(([libraryKey, lib]) => {
      // Check if the library matches any iconify collection by name
      const matchingCollection = iconifyCollections[libraryKey]
      if (matchingCollection) {
        console.log("matchingCollection", matchingCollection)
        lib.samples = matchingCollection.samples
      }
      return [libraryKey, lib]
    })

  return { config, libraries }
}

export default function Index() {
  const { config, libraries } = useLoaderData<typeof loader>()
  console.log(libraries)
  const { ready } = useOptionalCli()

  const navigate = useNavigate()

  return (
    <FadeIn show={ready}>
      <ConnectedTerminal>npx pkgless</ConnectedTerminal>

      {libraries.length > 0 && (
        <>
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {libraries.map(([libraryKey, lib]) => {
              const typedLib = lib as LibraryItem
              return typedLib.type === "icon" ? (
                <IconLibraryCard
                  key={libraryKey}
                  library={libraryKey}
                  lib={typedLib as LibraryItem & { type: "icon" }}
                />
              ) : (
                <ComponentLibraryCard
                  key={libraryKey}
                  library={libraryKey}
                  lib={typedLib as LibraryItem & { type: "component" }}
                />
              )
            })}
          </div>
        </>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8 mt-4">
        {packageTypes.map((pkg) => (
          <Card
            key={pkg.type}
            onClick={() => navigate(pkg.link)}
            className="hover:bg-neutral-50"
          >
            <CardHeader className="flex-col px-4">
              <CardTitle className="flex items-center gap-2">
                <Icon name="plus" className="w-5 h-5 -mx-1" />
                <Link to={pkg.link}>{pkg.title}</Link>
              </CardTitle>
              <CardDescription>{pkg.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </FadeIn>
  )
}

function IconLibraryCard({
  library,
  lib,
}: {
  library: string
  lib: {
    type: "icon"
    name: string
    items: Record<string, unknown>
    registryUrl?: string
    author?: string
  }
}) {
  const libraryUrl = `/icon/${library}`
  const navigate = useNavigate()

  return (
    <Card onClick={() => navigate(libraryUrl)} className="hover:bg-neutral-50">
      <CardHeader>
        <CardTitle>{lib.name || library}</CardTitle>
      </CardHeader>
      {lib.samples.length > 0 ? (
        <CardContent>
          <div className="flex space-x-2 mt-4">
            {lib.samples.map((iconName) => (
              <IconifyIcon
                key={iconName}
                icon={`${library}:${iconName}`}
                className="h-5 w-5"
              />
            ))}
          </div>
        </CardContent>
      ) : null}
    </Card>
  )
}
