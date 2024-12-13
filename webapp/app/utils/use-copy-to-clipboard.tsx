// https://usehooks-ts.com/react-hook/use-copy-to-clipboard#hook

import { useCallback, useRef, useState } from "react"

type CopiedValue = string | null

type CopyFn = (text?: string) => Promise<boolean>

export function useCopyToClipboard(): [CopiedValue, CopyFn] {
  const [copiedText, setCopiedText] = useState<CopiedValue>(null)
  const timeout = useRef<NodeJS.Timeout | null>(null)

  const copy: CopyFn = useCallback(async (text) => {
    if (!navigator?.clipboard) {
      console.warn("Clipboard not supported")
      return false
    }

    if (text === undefined) {
      setCopiedText(null)
      return true
    }

    // Try to save to clipboard then save it in the state if worked
    try {
      await navigator.clipboard.writeText(text)
      setCopiedText(text)

      if (timeout.current) {
        clearTimeout(timeout.current)
      }

      timeout.current = setTimeout(() => {
        setCopiedText(null)
      }, 300)
      return true
    } catch (error) {
      console.warn("Copy failed", error)
      setCopiedText(null)
      return false
    }
  }, [])

  return [copiedText, copy]
}
