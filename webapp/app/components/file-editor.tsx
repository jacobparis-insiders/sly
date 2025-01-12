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
import { Input } from "./ui/input"
import { Form } from "@remix-run/react"
import { truncateGitHubUrl } from "#app/utils/truncate-github-url.js"

const readWriteFileMachine = setup({
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
  initial: "idle",
  states: {
    idle: {
      on: {
        TOGGLE_EDIT: "edit",
        VIEW_DIFF: "diff",
      },
    },
    edit: {
      on: {
        SAVE_EDITS: {
          target: "idle",
          actions: "saveEdits",
        },
        CANCEL: {
          target: "idle",
          actions: "cancelEdit",
        },
      },
    },
    diff: {
      on: {
        CONTINUE: {
          target: "idle",
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
          target: "idle",
          actions: "cancelEdit",
        },
      },
    },
  },
})

const writeFileMachine = setup({
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
  // in the write machine, the idle state is editable
  initial: "idle",
  states: {
    idle: {
      on: {
        VIEW_DIFF: "diff",
      },
    },
    diff: {
      on: {
        CONTINUE: {
          target: "idle",
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
        CANCEL: "idle",
      },
    },
  },
})

export function FileEditor({
  file,
  onChange,
  mode = "read-write",
  onSelectVersion,
}: {
  mode?: "write" | "read-write"
  file: {
    path: string
    content: string
    type: string
    source?: string
    version?: string
  }
  onChange: ({
    oldPath,
    newFile,
  }: {
    oldPath: string
    newFile: { path: string; content: string; type: string }
  }) => void
  onSelectVersion: () => void
}) {
  const fileContent = file?.content || ""

  const [baseContent, setBaseContent] = useState(fileContent)
  const [currentContent, setCurrentContent] = useState(fileContent)
  const [editContent, setEditContent] = useState(fileContent)

  const machine = mode === "write" ? writeFileMachine : readWriteFileMachine

  const [state, send] = useMachine(
    machine.provide({
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

  const [path, setPath] = useState(file.path)

  return (
    <div>
      <div className="p-2 mb-2">
        <div className="flex items-center gap-x-2 justify-between">
          <Form
            className="flex items-center gap-x-2"
            onSubmit={(e) => {
              console.log("submit")
              e.preventDefault()
              onChange({
                oldPath: file.path,
                newFile: {
                  path: path,
                },
              })
            }}
          >
            {mode === "read-write" && !state.matches("edit") ? (
              <div className="font-mono px-2">{path}</div>
            ) : (
              <Input
                type="text"
                value={path}
                onChange={(e) => {
                  setPath(e.target.value)
                }}
                className="rounded-l-sm font-mono shadow-smooth"
              />
            )}
            {path !== file.path ? (
              <Button
                type="submit"
                size="sm"
                variant="outline"
                className="rounded-tr-sm rounded-br-none px-4"
              >
                Rename
              </Button>
            ) : null}
          </Form>

          <div className="flex items-center gap-x-2 ">
            {state.matches("diff") ? (
              <>
                <Button
                  key="continue"
                  type="button"
                  variant="primary"
                  className="px-4"
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
                  key="cancel"
                  type="button"
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
                  key="save"
                  type="button"
                  variant="primary"
                  className="px-4"
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
                  key="cancel"
                  type="button"
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
                  key="diff"
                  type="button"
                  variant="outline"
                  className="px-4"
                  onClick={() => send({ type: "VIEW_DIFF" })}
                >
                  <Icon name="scissors" className="-ml-2 size-4" />
                  Diff
                </Button>
                {state.can({ type: "TOGGLE_EDIT" }) ? (
                  <Button
                    key="edit"
                    type="button"
                    variant="outline"
                    className="px-4"
                    onClick={() => send({ type: "TOGGLE_EDIT" })}
                  >
                    <Icon name="edit" className="-ml-2 size-4" />
                    Edit
                  </Button>
                ) : null}
              </>
            )}
          </div>
        </div>
        <div className="font-mono text-sm px-2">
          <a href={file.source} target="_blank" className=" text-sky-600">
            {truncateGitHubUrl(file.source || "")}
          </a>{" "}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="px-2"
            onClick={onSelectVersion}
          >
            {file.version?.slice(0, 7)} <Icon name="chevron-down" />
          </Button>
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
            readOnly={state.can({ type: "TOGGLE_EDIT" })}
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
