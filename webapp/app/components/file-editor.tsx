import { Button } from "#app/components/ui/button.js"
import { Icon } from "#app/components/icon.js"
import { CodeEditor } from "#app/components/code-editor.js"
import { useState } from "react"
import {
  tokenize,
  diffTokens,
  diffArrayToString,
  DiffOperation,
} from "@pkgless/diff"
import { setup, assign } from "xstate"
import { useMachine } from "@xstate/react"

const fileStateMachine = setup({
  types: {
    input: {} as {
      content: string
    },
    context: {} as {
      initialContent: string
      content: string
      diffArray: Array<DiffOperation>
    },
  },
  actions: {
    cancelEdit: assign(({ context }) => ({
      content: context.initialContent,
    })),
    saveEdits: () => {
      throw new Error("need to provide saveEdits action")
    },
    computeDiff: (
      args,
      params: { baseContent: string; currentContent: string },
    ) => {
      throw new Error("need to provide computeDiff action")
    },
  },
}).createMachine({
  context: ({ input }: { input: { content: string } }) => ({
    initialContent: input.content,
    content: input.content,
    diffArray: [] as DiffOperation[],
  }),
  initial: "view",
  states: {
    view: {
      on: {
        TOGGLE_EDIT: "edit",
        VIEW_DIFF: "diff",
      },
    },
    edit: {
      on: {
        SAVE_EDITS: {
          target: "view",
          actions: "saveEdits",
        },
        CANCEL: {
          target: "view",
          actions: "cancelEdit",
        },
      },
    },
    diff: {
      on: {
        CONTINUE: {
          target: "view",
          actions: [
            {
              type: "computeDiff",
              params: ({ event }) => ({
                baseContent: event.payload.baseContent,
                currentContent: event.payload.currentContent,
              }),
            },
          ],
        },
        CANCEL: {
          target: "view",
          actions: "cancelEdit",
        },
      },
    },
  },
})

export function FileEditor({
  file,
  onChange,
}: {
  file: { path: string; content: string; type: string }
  onChange: ({
    oldPath,
    newFile,
  }: {
    oldPath: string
    newFile: { path: string; content: string; type: string }
  }) => void
}) {
  const fileContent = file?.content || ""

  const [baseContent, setBaseContent] = useState(fileContent)
  const [currentContent, setCurrentContent] = useState(fileContent)
  const [editContent, setEditContent] = useState(fileContent)

  const [state, send] = useMachine(
    fileStateMachine.provide({
      actions: {
        saveEdits: ({ event }) => {
          onChange({
            oldPath: file.path,
            newFile: {
              path: file.path,
              content: event.payload,
              type: "file",
            },
          })

          setBaseContent(event.payload)
          setCurrentContent(event.payload)
          setEditContent(event.payload)
        },
        computeDiff: (
          args,
          params: { baseContent: string; currentContent: string },
        ) => {
          const diffArray = diffTokens({
            a: tokenize({
              content: params.baseContent,
              language: "typescript",
            }),
            b: tokenize({
              content: params.currentContent,
              language: "typescript",
            }),
          })

          onChange({
            oldPath: file.path,
            newFile: {
              path: `${file.path}.diff`,
              content: diffArrayToString(diffArray),
              type: "diff",
            },
          })
        },
      },
    }),
    {
      input: {
        content: fileContent,
      },
    },
  )

  return (
    <div>
      <div className="px-1 py-1 border-b border-sidebar-border flex gap-x-2 justify-between mb-2">
        <div className="flex items-center gap-x-2">
          <h2 className="text-sm text-muted-foreground">{file.path}</h2>
        </div>

        <div className="flex items-center gap-x-2 px-[2px]">
          {state.matches("diff") ? (
            <>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-tr-sm rounded-br-none px-4"
                onClick={() => {
                  send({
                    type: "CONTINUE",
                    payload: {
                      baseContent,
                      currentContent,
                    },
                  })
                }}
              >
                <Icon name="play" className="-ml-2 size-4" />
                Continue
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-tr-sm rounded-br-none px-4"
                onClick={() => send({ type: "CANCEL" })}
              >
                <Icon name="x" className="-ml-2 size-4" />
                Cancel
              </Button>
            </>
          ) : state.matches("edit") ? (
            <>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-tr-sm rounded-br-none px-4"
                onClick={() =>
                  send({
                    type: "SAVE_EDITS",
                    payload: editContent,
                  })
                }
              >
                <Icon name="play" className="-ml-2 size-4" />
                Save
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-tr-sm rounded-br-none px-4"
                onClick={() => send({ type: "CANCEL" })}
              >
                <Icon name="x" className="-ml-2 size-4" />
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-tr-sm rounded-br-none px-4"
                onClick={() => send({ type: "VIEW_DIFF" })}
              >
                <Icon name="scissors" className="-ml-2 size-4" />
                Diff
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-tr-sm rounded-br-none px-4"
                onClick={() => send({ type: "TOGGLE_EDIT" })}
              >
                <Icon name="edit" className="-ml-2 size-4" />
                Edit
              </Button>
            </>
          )}
        </div>
      </div>

      {state.matches("diff") ? (
        <div className="flex gap-x-4">
          <CodeEditor
            value={baseContent}
            onChange={(value) => setBaseContent(value || "")}
            className="w-1/2"
          />
          <CodeEditor
            value={currentContent}
            onChange={(value) => setCurrentContent(value || "")}
            className="w-1/2"
          />
        </div>
      ) : (
        <>
          <CodeEditor
            readOnly={!state.matches("edit")}
            value={editContent}
            onChange={(value) => {
              setEditContent(value || "")
            }}
          />
        </>
      )}
    </div>
  )
}
