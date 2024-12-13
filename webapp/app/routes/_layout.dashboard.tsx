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
import { Heading } from "#app/components/heading.js"
import { fetchConfig, useCliInfo, useOptionalCli } from "#app/use-connection.js"
import { FadeIn } from "#app/components/fade-in.js"
import { Icon } from "#app/components/icon.js"
import { Terminal } from "#app/components/terminal.js"
import { useConnectionId } from "#app/root.js"
import { usePartyMessages } from "#app/party.js"

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
    type: "icon",
    title: "Add Icon",
    description: "Add from Iconify",
    link: "/iconify",
  },
  {
    type: "gist",
    title: "Add Gist",
    description: "Import a GitHub Gist",
    link: "/gist",
  },
  {
    type: "diff",
    title: "Add Diff",
    description: "Add a code diff",
    link: "/diff",
  },
  {
    type: "commit",
    title: "Add Commit",
    description: "Add a commit",
    link: "/commit",
  },
  {
    type: "pr",
    title: "Add Pull Request",
    description: "Add a pull request",
    link: "/pr",
  },
]

export async function clientLoader({ request }: ClientLoaderFunctionArgs) {
  const { value: config } = await fetchConfig(request)

  return { config }
}

export default function Index() {
  const { config } = useLoaderData<typeof clientLoader>()
  const { cwd, state, ready } = useOptionalCli()

  const navigate = useNavigate()

  return (
    <FadeIn show={ready}>
      <Terminal>
        {state === "loading"
          ? `Connecting…`
          : state === "success"
            ? `Connected to ${cwd}`
            : `Disconnected`}
      </Terminal>

      <Heading>libraries</Heading>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {Object.entries(config?.libraries || {}).map(([libraryKey, lib]) => {
          const typedLib = lib as LibraryItem
          return typedLib.type === "component" ? (
            <ComponentLibraryCard
              key={libraryKey}
              library={libraryKey}
              lib={typedLib as LibraryItem & { type: "component" }}
            />
          ) : (
            <IconLibraryCard
              key={libraryKey}
              library={libraryKey}
              lib={typedLib as LibraryItem & { type: "icon" }}
            />
          )
        })}
      </div>

      {config?.items?.length > 0 && (
        <>
          <Heading>items</Heading>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {config.items.map((item: { id: string }) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        </>
      )}

      <Heading className="mt-8">new</Heading>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
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

function ItemCard({ item }: { item: any }) {
  return <DefaultItemCard item={item} />
}

function DefaultItemCard({ item }: { item: any }) {
  const navigate = useNavigate()
  return (
    <Card
      onClick={() => navigate(`/items/${item.id}`)}
      className="hover:bg-neutral-50"
    >
      <CardHeader>
        <CardTitle>
          <Link to={`/items/${item.id}`} className="hover:underline">
            {item.name}
          </Link>
        </CardTitle>
        <CardDescription>{item.description}</CardDescription>
      </CardHeader>
    </Card>
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
  const libraryUrl = `/icon/${library}?registryUrl=${encodeURIComponent(
    lib.registryUrl || "",
  )}`
  const navigate = useNavigate()

  return (
    <Card onClick={() => navigate(libraryUrl)} className="hover:bg-neutral-50">
      <CardHeader>
        <CardTitle>{lib.name || library}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex space-x-2">
          {Object.keys(lib.items || {})
            .slice(0, 6)
            .map((iconName) => (
              <IconifyIcon key={iconName} icon={iconName} className="h-5 w-5" />
            ))}
        </div>
      </CardContent>
    </Card>
  )
}
