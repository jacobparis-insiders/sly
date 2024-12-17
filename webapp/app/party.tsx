import { use, createContext, useState, useEffect, useMemo, useRef } from "react"
import { useConnectionId } from "./root"
import usePartySocket from "partysocket/react"

import { createSelector } from "reselect"

export const PartyContext = createContext<
  ReturnType<typeof usePartySocket> | undefined | null
>(undefined)

export const PartyMessagesContext = createContext<
  Array<{ messageId: string; type: string }> | undefined
>(undefined)
// We use a single top level context here to keep a persistent socket connection
// then the whole app can use the same one and we can listen for pushes
export function PartyProvider({ children }: { children: React.ReactNode }) {
  const connectionId = useConnectionId()
  const [messages, setMessages] = useState<
    { messageId: string; type: string }[]
  >([])

  const party = usePartySocket({
    startClosed: !connectionId,
    host: "localhost:1999",
    party: "cli",
    query: {
      source: "webapp/app/party.tsx",
    },
    room: connectionId,
  })

  useEffect(() => {
    const abortController = new AbortController()

    party.addEventListener(
      "message",
      (event) => {
        const data = JSON.parse(event.data)
        console.log("message", data)

        setMessages((prev) => [...prev, data])
      },
      { signal: abortController.signal },
    )

    party.addEventListener(
      "close",
      () => {
        abortController.abort()
      },
      { signal: abortController.signal },
    )
    return () => {
      abortController.abort()
    }
  }, [party])

  return (
    <PartyContext value={party}>
      <PartyMessagesContext value={messages}>{children}</PartyMessagesContext>
    </PartyContext>
  )
}

export function useParty() {
  const context = use(PartyContext)

  if (context === undefined)
    throw new Error("useParty must be used within PartyContext")

  return context
}

const filteredMessages = createSelector(
  [
    (state: { messages: any[]; messageId: string }) => state.messages,
    (state: { messageId: string }) => state.messageId,
  ],
  (messages, messageId) =>
    messages.filter((msg) => msg.messageId === messageId),
)

export function usePartyMessages({ messageId }: { messageId?: string } = {}) {
  const messages = use(PartyMessagesContext)

  if (messages === undefined)
    throw new Error("usePartyMessages must be used within PartyMessagesContext")

  if (!messageId) return messages

  return filteredMessages({ messages, messageId })
}
