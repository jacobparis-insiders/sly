import type { LoaderFunctionArgs } from "@remix-run/node"
import type { ClientLoaderFunctionArgs } from "@remix-run/react"
import {
  Form,
  useLoaderData,
  useSearchParams,
  useSubmit,
} from "@remix-run/react"
import { Button } from "#app/components/ui/button.tsx"
import { invariant } from "@epic-web/invariant"
import { getIconifyLibraryIndex } from "../../../lib/iconify.js"
import { PaginationBar } from "#app/components/pagination-bar.js"
import { cachified, lru } from "#app/cache.server.js"
import { IconifyThumbnail } from "#app/components/iconify-thumbnail.js"
import type { BreadcrumbHandle } from "#app/components/ui/breadcrumbs.js"
import { CartProvider, useCart } from "#app/cart-context.tsx"
import { Terminal } from "#app/components/terminal.js"
import {
  fetchConfig,
  useAddIcons,
  useOptionalCli,
} from "#app/use-connection.js"
import { useCopyToClipboard } from "#app/utils/use-copy-to-clipboard.js"
import { cn } from "#app/utils/misc.js"
import { FadeIn } from "#app/components/fade-in.js"

import { useSpinDelay } from "spin-delay"
import { usePartyMessages } from "#app/party.js"
import { Input } from "#app/components/ui/input.js"

import { isReplicated, replicate } from "#app/utils/replicate.ts"
import { Icon } from "#app/components/icon.js"

export const handle: BreadcrumbHandle = {
  breadcrumb: " ",
}

export async function loader({ params, request }: LoaderFunctionArgs) {
  const libraryId = params.libraryId!
  invariant(libraryId, "Library ID is required")
  const url = new URL(request.url)
  const skip = Number(url.searchParams.get("skip")) || 0
  const take = Number(url.searchParams.get("take")) || 12
  const query = url.searchParams.get("q")

  try {
    const icons = await cachified({
      cache: lru,
      key: `iconify-library-index-${libraryId}-icons-${query}-${skip}`,
      async getFreshValue() {
        const result = await getIconifyLibraryIndex(libraryId, {
          query: query || undefined,
          limit: take,
          skip,
        })

        const icons =
          "icons" in result
            ? {
                icons: result.icons.map((icon) =>
                  icon.replace(libraryId + ":", ""),
                ),
                totalItems: result.total,
              }
            : {
                icons: [
                  ...(result.uncategorized || []),
                  ...Object.values(result.categories || {}).flat(),
                ],
                totalItems: result.total,
              }

        return icons
      },
    })

    return {
      breadcrumbLabel: libraryId,
      libraryId,
      resources: icons.icons.slice(0, take),
      totalItems: icons.totalItems,
    }
  } catch (error) {
    return {
      breadcrumbLabel: libraryId,
      libraryId,
      resources: [],
      error: error instanceof Error ? error.message : "Failed to load icons",
      totalItems: 0,
    }
  }
}

let config: Awaited<ReturnType<typeof fetchConfig>>
clientLoader.hydrate = true
export async function clientLoader({
  request,
  params,
  serverLoader,
}: ClientLoaderFunctionArgs) {
  const libraryId = params.libraryId!

  const icons = await replicate({
    key: `iconify-library-index-${libraryId}-icons`,
    ttl: 24 * 60 * 60 * 1000, // 24 hours
    async getFreshData() {
      await new Promise((resolve) => setTimeout(resolve, 3000))
      const response = await fetch(`/icon/${libraryId}/items.json`)
      return response.json()
    },
  })

  if (!icons) {
    // Fallback to server loader on error
    const loaderData = await serverLoader<typeof loader>()
    config = await fetchConfig(request).then(({ value }) => value?.config)
    return { ...loaderData, config }
  }

  // can we replace isReplicated with the return value from this??
  // replicateIcons: Promise<Result> | null
  if (!config) {
    config = await fetchConfig(request).then(({ value }) => value?.config)
  }

  const url = new URL(request.url)
  const take = Number(url.searchParams.get("take")) || 12
  const skip = Number(url.searchParams.get("skip")) || 0
  const query = url.searchParams.get("q")

  const filteredResources = icons.resources.filter((icon) =>
    icon.includes(query || ""),
  )

  return {
    breadcrumbLabel: params.libraryId!,
    libraryId: params.libraryId!,
    resources: filteredResources.slice(skip, skip + take),
    totalItems: filteredResources.length,
    config,
  }
}

export default function Library() {
  return (
    <CartProvider name="icon">
      <LibraryContent />
    </CartProvider>
  )
}

function LibraryContent() {
  const { cwd, ready } = useOptionalCli()

  const { libraryId, resources, totalItems, config } =
    useLoaderData() as Awaited<ReturnType<typeof clientLoader>>
  const { addToCart, removeFromCart, clearCart, isInCart, state } =
    useCart("icon")
  const { addIcons, state: addIconsState } = useAddIcons()
  const isRunning = useSpinDelay(addIconsState === "loading", {
    delay: 100,
    minDuration: 1000,
  })
  const messages = usePartyMessages({ type: "add-icons-response-log" })
  const [copied, copy] = useCopyToClipboard()
  const [searchParams] = useSearchParams()
  const selectedItemsString = state.items
    .filter((item) => item.library === libraryId)
    .map((item) => item.component)
    .join(" ")

  const isNewLibrary = !(libraryId in (config?.libraries || {}))

  const submit = useSubmit()
  return (
    <FadeIn show={ready} className="max-w-3xl">
      <Terminal className="">
        <div className="mb-4 text-rose-400">{cwd}</div>
        npx pkgless add {libraryId}{" "}
        <span className="text-green-200/80">{selectedItemsString}</span>
        {isNewLibrary ? " --save" : ""}
        {messages.length > 0 && (
          <div className="mt-2">
            {messages.map((log) => (
              <div key={log.messageId}>{log.message}</div>
            ))}
          </div>
        )}
      </Terminal>

      <div className="flex gap-x-2 items-center mt-2">
        <Button
          type="button"
          variant="outline"
          className={cn(
            "shadow-smooth transition-colors",
            isRunning && "hover:bg-black bg-black text-white hover:text-white",
          )}
          onClick={() => {
            addIcons({
              libraryId,
              items: state.items
                .filter((item) => item.library === libraryId)
                .map((item) => item.component),
            })
          }}
        >
          <Icon name="play" className="-ml-2 size-4" />
          run
        </Button>

        <Button
          type="button"
          variant="outline"
          className={cn(
            "shadow-smooth transition-colors",
            copied &&
              "hover:bg-white border-green-500/40  hover:border-green-500/40 hover:text-green-800",
          )}
          onClick={() =>
            copy(`npx pkgless add ${libraryId} ${selectedItemsString}`)
          }
        >
          <Icon
            name={copied ? "copy-check" : "copy"}
            className={cn("-ml-2 size-4")}
          />
          copy
        </Button>

        <Button
          type="button"
          variant="outline"
          className={cn("shadow-smooth")}
          onClick={() => {
            clearCart()
          }}
        >
          <Icon name="x" className="-ml-2 size-4" />
          clear
        </Button>
      </div>

      {/* Installed Icons */}
      {/* <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {Object.entries(config.libraries[libraryId]?.items || {}).map(
          ([icon, sha]) => (
            <div key={icon} className="flex flex-col items-center">
              <Button
                variant="outline"
                className="w-full aspect-square transition-all hover:scale-105 border-green-400/20 bg-green-50 dark:bg-green-900/20"
                disabled
                aria-label={`${icon} icon (installed)`}
                aria-describedby={`${icon}-label`}
              >
                <IconifyIcon
                  icon={`${libraryId}:${icon}`}
                  className="h-48 w-48 text-green-500"
                  width={48}
                  height={48}
                />
                <span className="sr-only">Installed</span>
              </Button>
              <span
                id={`${icon}-label`}
                className="mt-2 text-sm font-medium text-center"
              >
                {icon}
              </span>
            </div>
          ),
        )}
      </div> */}
      <Form
        method="GET"
        className="mt-8 mb-4"
        onChange={(event) => {
          submit(event.currentTarget, {
            replace: true,
            method: "GET",
          })
        }}
      >
        <Input
          type="search"
          name="q"
          placeholder="Search icons..."
          defaultValue={searchParams.get("q") ?? ""}
          className="max-w-sm font-mono shadow-smooth"
        />
        <input
          type="hidden"
          name="take"
          value={searchParams.get("take") ?? ""}
        />
      </Form>

      <div className="grid gap-2 grid-cols-3 @lg:grid-cols-6 @lg:gap-4">
        {resources.filter(Boolean).map((icon) => {
          invariant(icon, "Icon is required")
          const isSelected = isInCart({
            library: libraryId,
            component: icon,
          })

          return (
            <IconifyThumbnail
              key={icon}
              libraryId={libraryId}
              name={icon}
              isSelected={isSelected}
              onClick={() => {
                isSelected
                  ? removeFromCart({ library: libraryId, component: icon })
                  : (copy(), addToCart({ library: libraryId, component: icon }))
              }}
            />
          )
        })}
      </div>

      <div className="mt-8 flex justify-center">
        <PaginationBar total={totalItems} className="mt-4" />
      </div>
    </FadeIn>
  )
}
