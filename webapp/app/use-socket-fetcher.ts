import { useId, useState, useCallback, useRef, useEffect } from "react"
import { useParty } from "./party"

export function useSocketFetcher() {
  const party = useParty()

  const fetcherKey = useId()
  const [state, setState] = useState({
    data: null,
    error: null,
    state: "idle" as "idle" | "loading" | "success" | "error",
  })

  const messageIdRef = useRef<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const sendAbortSignal = useCallback(() => {
    if (!party) return

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    if (messageIdRef.current) {
      party.send(
        JSON.stringify({
          type: "abort",
          messageId: messageIdRef.current,
        }),
      )
      messageIdRef.current = null
    }
  }, [party])

  const send = useCallback(
    (payload: Record<string, any>) => {
      // If we have a clientLoader, party seems to be not ready by the time this sends
      const messageId = `${fetcherKey}-${Date.now()}`

      setTimeout(() => {
        if (!party) return

        sendAbortSignal() // Abort any ongoing request

        messageIdRef.current = messageId
        abortControllerRef.current = new AbortController()

        setState((prev) => ({ ...prev, state: "loading" }))
        console.log(
          "sending",
          JSON.stringify({
            messageId,
            ...payload,
          }),
        )

        // Send the request via the WebSocket
        party.send(
          JSON.stringify({
            messageId,
            ...payload,
          }),
        )
      }, 1)

      if (!party) return
      return messageId
    },
    [fetcherKey, sendAbortSignal, party],
  )

  const reset = useCallback(() => {
    sendAbortSignal() // Abort current request
    setState({
      data: null,
      error: null,
      state: "idle",
    })
  }, [sendAbortSignal])

  // Add event listener for incoming messages
  useEffect(() => {
    if (!party) return

    party.addEventListener(
      "message",
      (event) => {
        const json = event.data.startsWith("{")
          ? JSON.parse(event.data)
          : JSON.parse(event.data.split(":").slice(1).join(":"))

        if (json.messageId !== messageIdRef.current) return
        if (json.keepAlive) return

        messageIdRef.current = null
        abortControllerRef.current = null

        if (json.error) {
          setState({ data: null, error: json.error, state: "error" })
        } else {
          setState({ data: json, error: null, state: "success" })
        }
      },
      { signal: abortControllerRef.current?.signal },
    )

    return () => {
      abortControllerRef.current?.abort()
    }
  }, [party])

  return {
    send,
    reset,
    ...state,
  }
}
