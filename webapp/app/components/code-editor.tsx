import { ComponentProps, useRef } from "react"
import MonacoEditor from "@monaco-editor/react"

export function CodeEditor({
  name,
  value,
  options = {},
  ...props
}: ComponentProps<typeof MonacoEditor> & { name?: string }) {
  const editorRef = useRef(null)

  const lineCount = value?.split("\n").length ?? 8
  const lineHeight = 21
  const padding = 20

  return (
    <>
      <MonacoEditor
        height={`${lineCount * lineHeight + padding}px`}
        value={value}
        {...props}
        options={{
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          fontSize: 14,
          lineNumbers: "on",
          renderLineHighlight: "none",
          overviewRulerLanes: 0,
          hideCursorInOverviewRuler: true,
          scrollbar: {
            vertical: "hidden",
            horizontal: "hidden",
          },
          lineNumbersMinChars: 3,
          ...options,
        }}
        onMount={(editor) => {
          editorRef.current = editor
          editor.layout() // Ensure the layout updates when the height changes
        }}
      />
      {name ? (
        <input type="hidden" name={name} value={value || props.defaultValue} />
      ) : null}
    </>
  )
}
