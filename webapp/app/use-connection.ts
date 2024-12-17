import { redirect } from "@remix-run/react"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useConnectionId } from "./root"
import PartySocket from "partysocket"
import { cookieSessionStorage } from "./routes/api.connect.$id"
import ws from "ws"
import {
  Config,
  ConfigResponseSchema,
  ItemFilesResponseSchema,
} from "../../lib/schemas"
import { useSocketFetcher } from "./use-socket-fetcher"
import { useParty, usePartyMessages } from "./party"

export function useCliInfo() {
  const fetcher = useSocketFetcher()

  useEffect(() => {
    if (!fetcher.data && fetcher.state === "idle") {
      fetcher.send({ type: "request-cli" })
    }
  }, [fetcher])

  return {
    state: fetcher.state,
    cwd: fetcher.data?.cwd,
  }
}

/**
 * Gets CLI info or returns `ready` when we've determined it's not connected
 * Use this on pages that don't require a connection but where we don't want a FoUC
 *
 * @example
 * const { ready } = useOptionalCli()
 * return <FadeIn show={ready}>
 */
export function useOptionalCli() {
  const connectionId = useConnectionId()
  const { state: initialState, cwd } = useCliInfo()
  const statusMessages = usePartyMessages({ type: "status" })
  const lastStatusMessage = statusMessages.at(-1)
  const state =
    lastStatusMessage && lastStatusMessage.cliStatus === null
      ? "error"
      : initialState
  return {
    state,
    cwd,
    ready: connectionId ? state === "success" || state === "error" : true,
  }
}

export function useFileTree() {
  const fetcher = useSocketFetcher()

  useEffect(() => {
    if (!fetcher.data && fetcher.state === "idle") {
      fetcher.send({ type: "request-file-tree" })
    }
  }, [fetcher])

  console.log("fetcher.data", fetcher.data)
  return {
    state: fetcher.state,
    files: (fetcher.data?.files || []) as Array<string>,
  }
}

// TODO: write files into indexedDB
export function useFiles(paths: Array<string | null>) {
  const fetcher = useSocketFetcher()

  const pathsKey = paths.filter(Boolean).sort().join(",")
  const [prevPathsKey, setPrevPathsKey] = useState(pathsKey)
  if (pathsKey !== prevPathsKey) {
    setPrevPathsKey(pathsKey)
    fetcher.reset()
  }

  useEffect(() => {
    const files = pathsKey.split(",").filter(Boolean)

    if (!fetcher.data && fetcher.state === "idle" && files.length > 0) {
      fetcher.send({ type: "request-files", files })
    }
  }, [fetcher, pathsKey])

  return {
    state: fetcher.state,
    files: fetcher.data?.files || [],
  }
}

export function useFile(path: string | null) {
  const { state, files } = useFiles([path])
  return {
    state,
    file: files[0],
  }
}

export function useConfig() {
  const fetcher = useSocketFetcher()

  useEffect(() => {
    if (!fetcher.data && fetcher.state === "idle") {
      fetcher.send({ type: "request-config" })
    }
  }, [fetcher])

  return {
    state: fetcher.state,
    config: fetcher.data?.value,
  }
}

// export function usePartyMessages({ type }: { type?: string } = {}) {
//   const party = useParty()!
//   const [messages, setMessages] = useState<
//     { messageId: string; type: string }[]
//   >([])

//   useEffect(() => {
//     party.addEventListener("message", (event) => {
//       const data = JSON.parse(event.data)
//       if (type && data.type !== type) return

//       setMessages((prev) => [...prev, data])
//     })
//   }, [party, type])

//   return messages
// }

export function useAddIcons() {
  const fetcher = useSocketFetcher()

  return {
    state: fetcher.state,
    addIcons: (payload: { libraryId: string; items: string[] }) =>
      fetcher.send({ type: "add-icons", ...payload }),
  }
}

export function useAddComponents() {
  const fetcher = useSocketFetcher()
  const [messageId, setMessageId] = useState<string | undefined>()

  const messages = usePartyMessages({ messageId })
  return {
    state: fetcher.state,
    messages,
    addComponents: (payload: { libraryId: string; items: string[] }) => {
      setMessageId(fetcher.send({ type: "add-components", ...payload }))
    },
  }
}

export function useSendActorEvent() {
  const fetcher = useSocketFetcher()

  return {
    state: fetcher.state,
    sendActorEvent: (payload: { type: string; input: any }) => {
      fetcher.send({ type: "send-actor-event", input: payload })
    },
  }
}

export function useConfigureLibrary() {
  const fetcher = useSocketFetcher()

  return {
    state: fetcher.state,
    configureLibrary: (payload: {
      libraryId: string
      config: {
        name?: string
        directory?: string
        postinstall?: string
      }
    }) => fetcher.send({ type: "config-library", ...payload }),
  }
}

export function useInstallFiles() {
  const fetcher = useSocketFetcher()

  return {
    state: fetcher.state,
    installFiles: (payload: {
      files: Array<{ path: string; content: string }>
    }) => fetcher.send({ type: "install-files", ...payload }),
  }
}

export function useUpdateConfig() {
  const fetcher = useSocketFetcher()

  return {
    state: fetcher.state,
    updateConfig: (payload: { value: unknown }) =>
      fetcher.send({ type: "update-config", ...payload }),
  }
}

export function useConnection() {
  const [messages, setMessages] = useState<
    { messageId: string; type: string }[]
  >([])

  const party = useParty()!

  return {
    requestCliInfo: useCallback(() => {
      const messageId = crypto.randomUUID() as string

      void partyFetch({
        party,
        payload: { type: "request-cli" },
        expectedResponseType: "cli-response",
        messageId,
      })

      return messageId
    }, [party]),

    updateConfig: useCallback(
      (config: unknown) => {
        const message = JSON.stringify({ type: "update-config", value: config })
        party.send(message)
      },
      [party],
    ),

    addIcons: useCallback(
      ({ libraryId, items }: { libraryId: string; items: string[] }) => {
        const messageId = crypto.randomUUID() as string

        void partyFetch({
          party,
          payload: { type: "add-icons", libraryId, items },
          expectedResponseType: "add-icons-response",
          messageId,
          onMessage: (json) => {
            setMessages((prev) => [...prev, json])
          },
        })

        return messageId
      },
      [party],
    ),

    messages,
  }
}

export async function getConnectionId(request: Request) {
  const url = new URL(request.url)

  // Allow this to work in the browser and in the server
  const cookie =
    "document" in globalThis ? document.cookie : request.headers.get("Cookie")

  // If there's a new connection, we need to use that instead of reading the cookie
  const newConnectionId = url.searchParams.get("connectionId")
  if (newConnectionId) {
    const session = (await cookieSessionStorage.getSession(cookie)) || {}
    session.set("id", newConnectionId)
    url.searchParams.delete("connectionId")
    throw redirect(url.toString(), {
      headers: {
        "Set-Cookie": await cookieSessionStorage.commitSession(session),
      },
    })
  }

  const session = await cookieSessionStorage.getSession(cookie)

  return session.get("id")
}

export async function getConnection(request: Request) {
  const connectionId = await getConnectionId(request)

  console.log("connectionId", connectionId)
  const party = new PartySocket({
    host: "localhost:1999",
    party: "cli",
    room: connectionId,
    WebSocket: ws,
    query: {
      source: "webapp/getConnection",
    },
  })

  // Handle request abort
  request.signal.addEventListener("abort", () => {
    party.close()
  })

  return {
    connectionId,
    close: () => party.close(),
    async getConfig() {
      try {
        const result = await partyFetch({
          party,
          payload: { type: "request-config" },
          expectedResponseType: "config-response",
        })

        return ConfigResponseSchema.parse(result)
      } catch (e) {
        console.error("error getting config", e)
        return null
      }
    },
    async getItemFiles(libraryId: string, items: string[]) {
      try {
        const result = await partyFetch({
          party,
          payload: { type: "request-item-files", libraryId, items },
          expectedResponseType: "item-files-response",
        })
        return ItemFilesResponseSchema.parse(result)
      } catch (e) {
        console.error("error getting item files", e)
        return null
      }
    },
  }
}

export async function partyFetch({
  party,
  payload,
  expectedResponseType,
  messageId: inputMessageId = () => crypto.randomUUID(),
  timeoutMs = 5000,
  onMessage = () => {},
}: {
  party: PartySocket
  payload: { type: string }
  expectedResponseType: string
  messageId?: string | (() => string)
  timeoutMs?: number
  onMessage?: (message: { messageId: string; type: string }) => void
}) {
  const messageId =
    typeof inputMessageId === "function" ? inputMessageId() : inputMessageId

  const message = JSON.stringify({ ...payload, messageId })

  return new Promise((resolve, reject) => {
    const abortController = new AbortController()

    const timeoutId = setTimeout(() => {
      abortController.abort()
      reject(
        new Error(
          `PartyFetch timeout after ${timeoutMs}ms for type: ${payload.type}`,
        ),
      )
    }, timeoutMs)

    party.addEventListener(
      "message",
      (event) => {
        const json = event.data.startsWith("{")
          ? JSON.parse(event.data)
          : JSON.parse(event.data.split(":").slice(1).join(":"))

        console.log("partyFetch message", json)
        if (json.messageId !== messageId) return

        onMessage(json)

        if (json.type === expectedResponseType) {
          clearTimeout(timeoutId)
          resolve(json)
          abortController.abort()
        }
      },
      { signal: abortController.signal },
    )
    party.send(message)
  })
}

export async function requireConnectionId(request: Request) {
  // this contains the ?connectionId=... guard
  // and will bind it to a cookie then redirect without the param
  const connectionId = await getConnectionId(request)
  if (!connectionId) {
    throw redirect("/")
  }

  return connectionId
}

export async function requireCliConnection(request: Request) {
  const connectionId = await requireConnectionId(request)

  const party = new PartySocket({
    host: "localhost:1999",
    party: "cli",
    room: connectionId,
    query: {
      source: "webapp/requireCliConnection",
    },
  })

  try {
    const status = await partyFetch({
      party,
      payload: { type: "status" },
      expectedResponseType: "status",
    })

    if (!status?.cliStatus) {
      throw redirect("/")
    }

    return true
  } finally {
    party.close()
  }
}

export async function fetchConfig(request: Request) {
  const connectionId = await requireConnectionId(request)

  const party = new PartySocket({
    host: "localhost:1999",
    party: "cli",
    room: connectionId,
    query: {
      source: "webapp/fetchConfig",
    },
  })

  try {
    const config = await partyFetch({
      party,
      payload: { type: "request-config" },
      expectedResponseType: "config-response",
    })

    return ConfigResponseSchema.parse(config)
  } finally {
    party.close()
  }
}
