import type { LoaderFunctionArgs } from "@remix-run/node"
import { Link, useLoaderData, useNavigate } from "@remix-run/react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "#app/components/ui/card.tsx"
import { Button } from "#app/components/ui/button.tsx"
import { Icon } from "#app/components/icon.js"
import { invariant } from "@epic-web/invariant"
import { z } from "zod"
import { LibraryConfig, libraryItemSchema } from "../../../lib/schemas.js"
import { resolveLibraryConfig } from "../../../lib/config.js"
import type { BreadcrumbHandle } from "#app/components/ui/breadcrumbs.js"
import { CartProvider, useCart } from "#app/cart-context.tsx"
import {
  getConnection,
  useAddComponents,
  useConfigureLibrary,
  useSendActorEvent,
} from "#app/use-connection.js"
import { Heading } from "#app/components/heading.js"
import { ConnectedTerminal, Terminal } from "#app/components/terminal.js"
import { db } from "#app/db.js"
import { useSpinDelay } from "spin-delay"
import { cn } from "#lib/utils.js"
import { useCopyToClipboard } from "#app/utils/use-copy-to-clipboard.js"
import { Label } from "#app/components/ui/label.js"
import { Input } from "#app/components/ui/input.js"
import { useState, useEffect, useRef } from "react"

export const handle: BreadcrumbHandle = {
  breadcrumb: " ",
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  const libraryId = params.libraryId
  invariant(libraryId, "Library ID is required")

  const library = db.libraries.find((lib) => lib.id === libraryId)
  invariant(library, "Library not found")

  const resources = await fetch(library.registryUrl, {
    headers: {
      "Content-Type": "application/json",
    },
  }).then((res) => res.json())

  const connection = await getConnection(request)
  try {
    const config = await connection?.getConfig()

    if (!config?.value) {
      return {
        breadcrumbLabel: library.name,
        resources,
        library,
        libraryId,
        config: null,
      }
    }

    const libConfig = config.value.libraries[libraryId]

    if (!libConfig) {
      throw new Error(`Library ${libraryId} not found`)
    }

    const itemsInConfig = resources.filter((item) =>
      libConfig.items?.hasOwnProperty(item.id),
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
  const {
    addToCart,
    removeFromCart,
    isInCart,
    clearCart,
    state: cartState,
  } = useCart("component")
  const { configureLibrary, state: configState } = useConfigureLibrary()

  const libraryConfig = config ? resolveLibraryConfig(config, libraryId) : null
  const libraryItems = config?.libraries[libraryId]?.items
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

  const { sendActorEvent } = useSendActorEvent()
  const { addComponents, messages, state: installState } = useAddComponents()
  const isRunning = useSpinDelay(installState === "loading", {
    delay: 100,
    minDuration: 1000,
  })

  const cursorRef = useRef<number>(0)
  const [showConfigCard, setShowConfigCard] = useState(false)

  useEffect(() => {
    const recentMessages = messages.slice(cursorRef.current)

    if (
      recentMessages.some((message) =>
        message.message?.includes("Configuring library..."),
      )
    ) {
      setButtonState("config")
    }

    if (
      recentMessages.some((message) =>
        message.message?.includes("Save settings to"),
      )
    ) {
      setButtonState("confirm")
    }

    if (
      recentMessages.some((message) =>
        message.message?.includes("Ready to install"),
      )
    ) {
      setButtonState("confirm")
    }

    cursorRef.current = messages.length
  }, [messages])

  const handleConfigSubmit = (config: LibraryConfig) => {}

  const [copied, copyToClipboard] = useCopyToClipboard()

  const [command, setCommand] = useState("")
  const navigate = useNavigate()

  const [buttonState, setButtonState] = useState<"idle" | "config" | "confirm">(
    "idle",
  )

  return (
    <div>
      <Heading>{library.name}</Heading>

      <div>
        <div className="flex-1">
          <ConnectedTerminal>
            {({ prompt }) => (
              <>
                <div>
                  {prompt}
                  npx pkgless add {libraryId}{" "}
                  {cartState.items.map((item) => item.component).join(" ")}
                </div>
                {messages.map((message) => (
                  <pre key={message.id}>{message.message}</pre>
                ))}
              </>
            )}
          </ConnectedTerminal>
        </div>

        <div className="mt-2">
          {buttonState === "idle" &&
            cartState.items.length > 0 &&
            !isRunning && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "shadow-smooth transition-colors gap-4",
                    isRunning &&
                      "hover:bg-black bg-black text-white hover:text-white",
                  )}
                  onClick={() => {
                    addComponents({
                      libraryId,
                      items: cartState.items.map((item) => item.component),
                    })
                  }}
                >
                  <Icon name="play" className="-ml-2 size-4" />
                  Run
                </Button>
              </>
            )}

          {buttonState === "idle" && !isRunning && (
            <Button
              type="button"
              variant="outline"
              className="shadow-smooth transition-colors"
              onClick={() => {
                setButtonState("config")
              }}
            >
              Config
            </Button>
          )}
          {buttonState === "config" && (
            <LibraryConfigCard
              libraryName={library.name}
              defaultConfig={libraryConfig}
              onChange={({ command }) => {
                setCommand(command)
              }}
              onSave={({ config }) => {
                sendActorEvent({
                  type: "input",
                  input: {
                    directory: config.directory,
                    postinstall: config.postinstall,
                  },
                })
              }}
            />
          )}
          {buttonState === "confirm" && (
            <>
              <Button
                type="button"
                variant="outline"
                className="shadow-smooth transition-colors"
                onClick={() => {
                  sendActorEvent({ type: "input", input: true })
                  // TODO: should probably set this based on message response
                  setButtonState("idle")
                }}
              >
                Yes
              </Button>
              <Button
                type="button"
                variant="outline"
                className="shadow-smooth transition-colors"
                onClick={() => {
                  sendActorEvent({ type: "input", input: false })
                  // TODO: should probably set this based on message response
                  setButtonState("idle")
                }}
              >
                No
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Display configured items if they exist, directly above the available items */}
      {libraryItems && (
        <div className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {Object.keys(libraryItems).map((itemId) => (
              <div
                key={itemId}
                className={cn(
                  "rounded-lg border bg-card text-card-foreground shadow-smooth py-4 cursor-default flex",
                  "relative shadow-smooth z-10 w-full text-5xl  h-auto",
                  "hover:bg-neutral-50 hover:border-neutral-300",
                )}
                onClick={() => {
                  navigate(`/component/${libraryId}/items/${itemId}`)
                }}
              >
                <CardHeader className="flex flex-row justify-between items-center gap-x-2">
                  <CardTitle>{itemId}</CardTitle>
                </CardHeader>
              </div>
            ))}
          </div>
        </div>
      )}

      <Heading className="mt-4">Available</Heading>

      {cartState.items.length > 0 && (
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            clearCart()
          }}
        >
          Clear selection
        </Button>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        {resources.map((component) => (
          <div
            key={component.name}
            className={cn(
              "rounded-lg border bg-card text-card-foreground shadow-smooth py-4 cursor-default flex",
              "relative shadow-smooth z-10 w-full text-5xl  h-auto",
              isInCart({ library: libraryId, component: component.name })
                ? "border-green-400 bg-green-50 dark:bg-green-900/20 hover:border-green-500 text-green-500"
                : "hover:bg-neutral-50 hover:border-neutral-300",
            )}
            onClick={() => {
              if (cartState.items.length > 0) {
                isInCart({ library: libraryId, component: component.name })
                  ? handleRemoveFromCart(component.name)
                  : handleAddToCart(component.name)
              } else {
                navigate(`/component/${libraryId}/items/${component.name}`)
              }
            }}
          >
            <CardHeader className="flex flex-row justify-between items-center gap-x-2">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  className="size-6"
                  checked={isInCart({
                    library: libraryId,
                    component: component.name,
                  })}
                  onClick={(event) => {
                    event.stopPropagation()
                  }}
                  onChange={(event) => {
                    isInCart({ library: libraryId, component: component.name })
                      ? handleRemoveFromCart(component.name)
                      : handleAddToCart(component.name)
                  }}
                />
              </div>
              <CardTitle>{component.name}</CardTitle>
            </CardHeader>
          </div>
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

function LibraryConfigCard({
  libraryName,
  onChange,
  onSave,
  defaultConfig = {
    directory: "",
    postinstall: "",
    transformers: [],
  },
}: {
  libraryName: string
  onChange: ({
    command,
    config,
  }: {
    command: string
    config: LibraryConfig
  }) => void
  onSave: ({
    command,
    config,
  }: {
    command: string
    config: LibraryConfig
  }) => void
  defaultConfig?: LibraryConfig
}) {
  const [savedConfigs, setSavedConfigs] = useState<LibraryConfig[]>([])
  const [currentConfig, setCurrentConfig] =
    useState<LibraryConfig>(defaultConfig)
  const [templateName, setTemplateName] = useState("")
  const [cardState, setCardState] = useState<"idle" | "edit" | "create">("edit")

  const handleLoadConfig = (config: LibraryConfig) => {
    setCurrentConfig(config)
    setCardState("idle")
  }

  function generateCommand(config: LibraryConfig) {
    const isTemplateInConfig = savedConfigs.some(
      (config) => config.name === templateName,
    )

    const sanitizeCommandSegment = (segment: string) => {
      return segment.includes(" ") ? `"${segment}"` : segment
    }

    const directoryFlag = config.directory
      ? `--directory ${sanitizeCommandSegment(config.directory)}`
      : ""
    const postinstallFlag = config.postinstall
      ? `--postinstall ${sanitizeCommandSegment(config.postinstall)}`
      : ""

    return templateName
      ? isTemplateInConfig
        ? `npx pkgless config ${libraryName} --save --config ${templateName}`
        : `npx pkgless config ${libraryName} --save --config ${templateName} ${directoryFlag} ${postinstallFlag}`
      : `npx pkgless config ${libraryName} --save ${directoryFlag} ${postinstallFlag}`
  }

  return (
    <Card className="w-full max-w-[300px]">
      <CardContent className="space-y-3 font-mono">
        {savedConfigs.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {savedConfigs.map((config) => (
              <Button
                type="button"
                key={config.name}
                variant="outline"
                size="sm"
                className="text-sm py-1 px-2 h-7"
                onClick={() => handleLoadConfig(config)}
              >
                {config.name}
              </Button>
            ))}
          </div>
        )}

        {cardState === "create" ? (
          <div className="flex gap-2">
            <Input
              placeholder="Template name"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="text-sm h-8 px-2 flex-grow"
            />
          </div>
        ) : null}

        {cardState === "idle" || cardState === "create" ? (
          <dl>
            <div className="flex justify-between">
              <dt className="text-sm font-medium">Directory</dt>
              <dd className="text-sm">
                {currentConfig.directory || "Not set"}
              </dd>
            </div>
            <div className="flex justify-between mt-1">
              <dt className="text-sm font-medium">Postinstall script</dt>
              <dd className="text-sm">
                {currentConfig.postinstall || "Not set"}
              </dd>
            </div>
          </dl>
        ) : (
          <>
            <div className="space-y-1">
              <Label htmlFor="directory" className="text-sm font-medium">
                Directory
              </Label>
              <Input
                id="directory"
                value={currentConfig.directory}
                onChange={(e) => {
                  const config = {
                    ...currentConfig,
                    directory: e.target.value,
                  }
                  setCurrentConfig(config)
                  onChange({
                    command: generateCommand(config),
                    config,
                  })
                }}
                className="text-sm h-8 px-2"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="postinstall" className="text-sm font-medium">
                Postinstall script
              </Label>
              <Input
                id="postinstall"
                value={currentConfig.postinstall || ""}
                onChange={(e) => {
                  const config = {
                    ...currentConfig,
                    postinstall: e.target.value.trim(),
                  }
                  setCurrentConfig(config)
                  onChange({
                    command: generateCommand(config),
                    config,
                  })
                }}
                className="text-sm h-8 px-2"
              />
            </div>
          </>
        )}

        {cardState === "edit" ? (
          <Button
            type="button"
            onClick={() => {
              setCardState("create")
            }}
            variant="outline"
          >
            Create Template
          </Button>
        ) : null}

        {cardState === "create" ? (
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={() => {
                setCardState("edit")
                setTemplateName("")
              }}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                if (!templateName) return

                const newConfig = { ...currentConfig, name: templateName }
                setSavedConfigs([...savedConfigs, newConfig])
                setCurrentConfig(newConfig)
                setCardState("idle")
                setTemplateName("")
                onSave({
                  command: generateCommand(currentConfig),
                  config: currentConfig,
                })
              }}
              disabled={!templateName}
            >
              Save
            </Button>
          </div>
        ) : cardState === "edit" ? (
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={() => {
                setCardState("idle")
              }}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                setCardState("idle")

                onSave({
                  command: generateCommand(currentConfig),
                  config: currentConfig,
                })
              }}
            >
              Save
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setCardState("edit")
            }}
          >
            Edit
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
