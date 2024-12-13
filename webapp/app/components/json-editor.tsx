// webapp/app/components/JsonEditor.tsx
import type { ComponentProps, RefObject } from "react"
import { useEffect, useRef } from "react"
import { EditorView, basicSetup } from "codemirror"
import { EditorState } from "@codemirror/state"
import { json } from "@codemirror/lang-json"

export default function JsonEditor({
  ref,
  body,
  onChange,
  ...props
}: {
  ref: RefObject<EditorView | null>
  body: string
  onChange?: (value: string) => void
} & Omit<ComponentProps<"div">, "ref" | "children" | "onChange">) {
  const editorRef = useRef<HTMLDivElement | null>(null)

  console.log("Rendering JsonEditor with body:", body)
  useEffect(() => {
    if (!ref.current && editorRef.current) {
      console.log("Initializing editor with body:", body)

      const startState = EditorState.create({
        doc: body,
        extensions: [
          basicSetup,
          json(),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              onChange?.(update.state.doc.toString())
            }
          }),
        ],
      })

      ref.current = new EditorView({
        state: startState,
        parent: editorRef.current,
      })
    }

    return () => {
      console.log("Destroying editor view")
      ref.current?.destroy()
      ref.current = null
    }
  }, [editorRef, ref, body, onChange])

  return <div className="flex-1 overflow-hidden" ref={editorRef} {...props} />
}
