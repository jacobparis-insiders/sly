import type { LoaderFunctionArgs } from "@remix-run/node"
import { Link, useLoaderData, useNavigate } from "@remix-run/react"
import { Card, CardHeader, CardTitle } from "#app/components/ui/card.tsx"
import { Button } from "#app/components/ui/button.tsx"
import { Icon } from "#app/components/icon.js"
import { invariant } from "@epic-web/invariant"
import { z } from "zod"
import { libraryItemSchema } from "../../../lib/schemas.js"
import type { BreadcrumbHandle } from "#app/components/ui/breadcrumbs.js"
import { CartProvider, useCart } from "#app/cart-context.tsx"
import { getConnection } from "#app/use-connection.js"
import { Heading } from "#app/components/heading.js"
import { Terminal } from "#app/components/terminal.js"

export const handle: BreadcrumbHandle = {
  breadcrumb: " ",
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  const libraryId = params.libraryId
  invariant(libraryId, "Library ID is required")

  const url = new URL(request.url)
  const registryUrl = url.searchParams.get("registryUrl")

  if (!registryUrl) {
    throw new Error("No registry URL provided")
  }

  console.log("Fetching registry URL:", registryUrl)
  const resources = await fetch(registryUrl, {
    headers: {
      "Content-Type": "application/json",
    },
  }).then((res) => res.json())

  const connection = await getConnection(request)
  try {
    const config = await connection?.getConfig()
    const library = config?.value.libraries[libraryId]

    if (!library) {
      throw new Error(`Library ${libraryId} not found`)
    }

    const itemsInConfig = resources.filter((item) =>
      config?.value.libraries[libraryId]?.items?.hasOwnProperty(item.id),
    )

    const itemFiles = await connection?.getItemFiles(
      libraryId,
      itemsInConfig.map((item) => item.id),
    )

    return {
      breadcrumbLabel: library.name,
      resources: z.array(libraryItemSchema).parse(resources) as Array<
        z.infer<typeof libraryItemSchema>
      >,
      itemFiles,
      library,
      libraryId,
      config: config?.value,
    }
  } finally {
    connection.close()
  }
}

export default function Library() {
  return (
    <CartProvider name="component">
      <LibraryContent />
    </CartProvider>
  )
}

function LibraryContent() {
  const { config, resources, library, libraryId } =
    useLoaderData<typeof loader>()
  const { addToCart, removeFromCart, isInCart, state } = useCart("component")

  if (!library) {
    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold text-red-600">Library not found</h2>
      </div>
    )
  }

  const isNewLibrary = !config.libraries[libraryId]

  async function handleAddToCart(componentName: string) {
    addToCart({
      library: libraryId,
      component: componentName,
    })
  }

  async function handleRemoveFromCart(componentName: string) {
    removeFromCart({
      library: libraryId,
      component: componentName,
    })
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex-1">
          <Terminal className="">
            npx pkgless add {libraryId}{" "}
            {state.items
              .filter((item) => item.library === libraryId)
              .map((item) => item.component)
              .join(" ")}
            {isNewLibrary ? " --save" : ""}
          </Terminal>
        </div>
      </div>

      <Heading>{library.name}</Heading>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(config.libraries[libraryId]?.items || {}).map(
          ([component, { id }]) => (
            <LibraryItem
              key={id}
              title={component}
              id={id}
              libraryId={libraryId}
            />
          ),
        )}
      </div>

      <Heading>available</Heading>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {resources.map((component) => (
          <Card key={component.id}>
            <CardHeader className="flex flex-row justify-between items-center">
              <CardTitle>{component.name}</CardTitle>
              <Button
                variant={
                  isInCart({ library: libraryId, component: component.id })
                    ? "default"
                    : "outline"
                }
                onClick={() =>
                  isInCart({ library: libraryId, component: component.id })
                    ? handleRemoveFromCart(component.id)
                    : handleAddToCart(component.id)
                }
                disabled={config.libraries[libraryId]?.items?.[component.id]}
              >
                <Icon
                  name={
                    config.libraries[libraryId]?.items?.[component.id]
                      ? "check"
                      : isInCart({
                            library: libraryId,
                            component: component.id,
                          })
                        ? "minus"
                        : "plus"
                  }
                  className="h-4 w-4"
                />
              </Button>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  )
}

function LibraryItem({
  title,
  filepath,
  id,
  libraryId,
}: {
  title: string
  filepath: string
  id: string
  libraryId: string
}) {
  const navigate = useNavigate()
  const href = `/component/${libraryId}/items/${id}`

  return (
    <Card onClick={() => navigate(href)}>
      <CardHeader>
        <CardTitle>
          <Link to={href}>{title}</Link>
        </CardTitle>
      </CardHeader>
    </Card>
  )
}
