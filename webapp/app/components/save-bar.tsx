"use client"

import type { UseMutationResult } from "@tanstack/react-query"
import { Button } from "./ui/button"
import { useEffect } from "react"
import { Icon } from "./icon"

export function SaveBar({
  mutation,
  onSave,
}: {
  mutation: UseMutationResult<void, Error, string, void>
  onSave: () => string
}) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "s") {
        event.preventDefault()
        mutation.mutate(onSave())
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [mutation, onSave])

  const message =
    mutation.status === "pending"
      ? "Saving"
      : mutation.status === "success"
        ? "Saved"
        : mutation.isError && mutation.error
          ? mutation.error.message
          : "Unsaved Changes"

  return (
    <div
      className="shadow-xl bg-white border border-neutral-200 fixed inset-x-0 bottom-3 z-20 mx-auto flex h-8 items-center justify-between rounded-full p-2 pl-3 text-sm font-medium transition-all duration-300 ease-in-out overflow-hidden"
      style={{
        willChange: "width, opacity, transform",
        width: mutation.status === "idle" ? "360px" : "96px",
      }}
    >
      {mutation.status === "pending" ? (
        <div
          key="toolbar"
          className={`text-gray-600 flex items-center gap-2 transition-opacity duration-300`}
        >
          <Icon name="cog" className="h-4 w-4 animate-spin" />
          <span>{message}</span>
        </div>
      ) : mutation.status === "success" ? (
        <div
          key="toolbar"
          className={`text-green-600 flex items-center gap-2 transition-opacity duration-300`}
        >
          <Icon name="check" className="h-4 w-4" />
          <span>{message}</span>
        </div>
      ) : mutation.isError && mutation.error ? (
        <div
          key="toolbar"
          className={`w-full flex whitespace-nowrap items-center gap-2 transition-opacity duration-300`}
        >
          <Icon name="alert-triangle" className="h-4 w-4 text-red-600" />
          <span className="grow text-red-600">Error: {message}</span>
          <Button
            className="h-7 px-4 bg-black text-white rounded-full hover:bg-black/90"
            onClick={onSave}
          >
            Retry
          </Button>
        </div>
      ) : (
        <div
          key="toolbar"
          className={`w-full flex whitespace-nowrap items-center gap-2 transition-opacity duration-300`}
        >
          <Icon name="alert-triangle" className="h-4 w-4 text-gray-500" />
          <span className="grow">{message}</span>
          <Button variant="outline" className="h-7 px-4 rounded-full">
            Reset
          </Button>

          <Button
            className="h-7 px-4 bg-black text-white rounded-full hover:bg-black/90"
            onClick={onSave}
          >
            Save
          </Button>
        </div>
      )}
    </div>
  )
}
