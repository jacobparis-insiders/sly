import { ComponentProps, useRef } from "react"
import MonacoEditor from "@monaco-editor/react"

export function CodeEditor({
  name,
  value,
  readOnly,
  options = {},
  ...props
}: ComponentProps<typeof MonacoEditor> & {
  name?: string
  readOnly?: boolean
}) {
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
          readOnly: readOnly,
          domReadOnly: readOnly,
          ...options,
        }}
        onMount={(editor, monaco) => {
          editorRef.current = editor
          editor.layout() // Ensure the layout updates when the height changes
          const elem = document.querySelector(".monaco-editor") as HTMLElement
          elem.style.setProperty("--vscode-editor-background", "transparent")
          elem.style.setProperty(
            "--vscode-editorGutter-background",
            "transparent",
          )
        }}
      />
      {name ? (
        <input type="hidden" name={name} value={value || props.defaultValue} />
      ) : null}
    </>
  )
}
