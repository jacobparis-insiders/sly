import { Link, useLoaderData, useNavigate } from "@remix-run/react"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "#app/components/ui/card.tsx"
import { Icon as IconifyIcon } from "@iconify/react"
import { ComponentLibraryCard } from "#app/components/component-library-card.js"
import { fetchConfig, useOptionalCli } from "#app/use-connection.js"
import { FadeIn } from "#app/components/fade-in.js"
import { Icon } from "#app/components/icon.js"
import { ConnectedTerminal } from "#app/components/terminal.js"
import { getIconifyIndex } from "../../../lib/iconify"
import { cachified } from "#app/cache.server.js"
import { LoaderFunctionArgs } from "@vercel/remix"
import { ItemCard } from "#app/components/cards/item-card.js"
import { truncateGitHubUrl } from "#app/utils/truncate-github-url.js"
import { parseGitHubUrl } from "#app/utils/parse-github-url.js"

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
  console.log({ config })
  const iconifyCollections = await cachified({
    key: "iconify-index",
    async getFreshValue() {
      return getIconifyIndex()
    },
  })

  // Only use libraries from config
  const libraries = config?.libraries
    ? Object.entries(config.libraries).map(([libraryKey, lib]) => {
        // Check if the library matches any iconify collection by name
        const matchingCollection = iconifyCollections[libraryKey]
        if (matchingCollection) {
          lib.samples = matchingCollection.samples
        }
        return [libraryKey, lib]
      })
    : []

  return { config, libraries }
}

function TemplateCard({
  template,
}: {
  template: { name: string; source: string }
}) {
  const navigate = useNavigate()
  const { owner, repo } = parseGitHubUrl(template.source)
  const href = `/github/${owner}/${repo}`
  return (
    <Card onClick={() => navigate(href)} className="hover:bg-neutral-50 px-2">
      <CardHeader className="flex flex-col items-start">
        <CardTitle className="flex items-center gap-2">
          <Link to={href}>{template.name}</Link>
        </CardTitle>
        <CardDescription>{truncateGitHubUrl(template.source)}</CardDescription>
      </CardHeader>
    </Card>
  )
}

export default function Index() {
  const { config, libraries } = useLoaderData<typeof loader>()
  const { ready } = useOptionalCli()

  const navigate = useNavigate()

  return (
    <FadeIn show={ready}>
      <ConnectedTerminal>npx pkgless</ConnectedTerminal>

      {config?.template && (
        <div className="mt-8 mb-4">
          <TemplateCard template={config.template} />
        </div>
      )}

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

      {config?.items?.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {config.items.map((item, index) => (
            <ItemCard key={item.path} index={index} item={item} />
          ))}
        </div>
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
    <Card
      onClick={() => navigate(libraryUrl)}
      className="hover:bg-neutral-50 px-2"
    >
      <CardHeader>
        <CardTitle>
          <Link to={libraryUrl}>{lib.name || library}</Link>
        </CardTitle>
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
