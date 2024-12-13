import { useLoaderData } from "@remix-run/react"
import { useState, useRef, useCallback } from "react"
import { getConnection, useConnection } from "#app/use-connection.js"
import type { LoaderFunctionArgs } from "@vercel/remix"
import type { EditorView } from "codemirror"
import JsonEditor from "#app/components/json-editor.js"
import { useMutation } from "@tanstack/react-query"

import { SaveBar } from "#app/components/save-bar.js"
import { ConfigSchema } from "../../../lib/schemas"

export async function loader({ request }: LoaderFunctionArgs) {
  const connection = await getConnection(request)
  try {
    const config = await connection?.getConfig()

    return {
      defaultConfig: config?.value ? JSON.stringify(config.value, null, 2) : "",
      filepath: config?.filepath,
    }
  } finally {
    connection?.close()
  }
}

export default function Configuration() {
  const { defaultConfig, filepath } = useLoaderData() as Awaited<
    ReturnType<typeof loader>
  >
  const connection = useConnection()

  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const editorViewRef = useRef<EditorView | null>(null)
  const [showSaveBar, setShowSaveBar] = useState(false)

  const handleEditorChange = useCallback(() => {
    const currentContent = editorViewRef.current?.state.doc.toString()
    const hasUnsavedChanges = currentContent !== defaultConfig
    setShowSaveBar(hasUnsavedChanges)
  }, [defaultConfig])

  const mutation = useMutation({
    mutationFn: async (configString: string) => {
      let newConfig
      try {
        newConfig = JSON.parse(configString)
      } catch (error) {
        if (error instanceof SyntaxError) {
          throw new Error(`Invalid JSON: ${error.message}`)
        } else {
          throw new Error(
            `Failed to parse JSON: ${error instanceof Error ? error.message : "Unknown error"}`,
          )
        }
      }

      // Validate against schema
      const result = ConfigSchema.safeParse(newConfig)
      if (!result.success) {
        const errors = result.error.issues.map(
          (issue) => `${issue.path.join(".")}: ${issue.message}`,
        )
        throw new Error(errors.join(", "))
      }

      await connection?.updateConfig(newConfig)
      await new Promise((resolve) => setTimeout(resolve, 1000))
    },
    onMutate: () => {
      setValidationErrors([])
      setShowSaveBar(true)
    },
    onError: (error) => {
      if (error instanceof Error) {
        setValidationErrors(error.message.split(", "))
      }
      setShowSaveBar(true)
    },
    onSuccess: () => {
      setTimeout(() => {
        mutation.reset()
        setShowSaveBar(false)
        setValidationErrors([])
      }, 1000)
    },
  })

  return (
    <div className="h-full relative">
      <div className="sticky top-0">
        {/* Filepath Display */}
        <div className="flex justify-between items-center p-2">
          <span className="text-gray-600 text-sm">{filepath}</span>
        </div>

        {/* Error and Success Messages */}
        <div className="space-y-2">
          {validationErrors.length > 0 && (
            <div className="text-red-500 text-sm bg-red-50 p-2 rounded">
              <div className="font-semibold mb-1">Validation Errors:</div>
              <ul className="list-disc list-inside space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {showSaveBar && (
        <SaveBar
          mutation={mutation}
          onSave={() => editorViewRef.current?.state.doc.toString() || ""}
        />
      )}

      <div className="flex flex-col h-full">
        <JsonEditor
          body={defaultConfig}
          ref={editorViewRef}
          onChange={handleEditorChange}
        />
      </div>
    </div>
  )
}
