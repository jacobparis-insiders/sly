import { Button } from "#app/components/ui/button.js"
import { Icon } from "#app/components/icon.js"
import { CodeEditor } from "#app/components/code-editor.js"
import { useEffect, useRef, useState } from "react"
import {
  diffArrayToString,
  diffStringToArray,
  DiffOperation,
} from "@pkgless/diff"
import { PreDiffViewWithTokens } from "#app/components/pre-diff-view.js"
import { setup, assign, fromObservable } from "xstate"
import { useMachine } from "@xstate/react"
import { createFetchObservable } from "#app/utils/observable-fetch.js"

const applyActor = fromObservable(({ input }) =>
  // helper function that streams each chunk into an observable
  createFetchObservable({
    url: "/api/apply-diff",
    options: {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  }),
)

const diffStateMachine = setup({
  types: {
    input: {} as {
      content: string
      baseContent: string
    },
    context: {} as {
      diffContent: string
      diffArray: Array<DiffOperation>
      applyResult: string
      draftContent: string
      baseContent: string
    },
  },
  actions: {
    saveEdits: ({ context }) => {
      const newDiffArray = diffStringToArray(context.draftContent)
      return {
        diffContent: context.draftContent,
        diffArray: newDiffArray,
      }
    },
    applyDiff: () => {
      throw new Error("need to provide applyDiff action")
    },
    saveAsFile: () => {
      throw new Error("need to provide saveAsFile action")
    },
  },
  actors: {
    apply: applyActor,
  },
}).createMachine({
  context: ({ input }) => ({
    // content of the diff
    diffContent: input.content,
    // temp content while editing, then saved to diffContent
    draftContent: input.content,
    // an array of tokens generated from the diff
    diffArray: diffStringToArray(input.content),
    // the base that the diff is applied to
    baseContent: input.baseContent,
    // result of diff applied to baseContent via LLM
    applyResult: "",
  }),
  initial: "view",
  states: {
    view: {
      on: {
        TOGGLE_EDIT: {
          target: "edit",
          actions: assign(({ context }) => ({
            draftContent: context.diffContent,
          })),
        },
        APPLY_DIFF: "preApply",
      },
    },
    edit: {
      on: {
        UPDATE_EDIT: {
          actions: assign(({ context, event }) => ({
            draftContent: event.payload,
          })),
        },
        SAVE_EDITS: {
          target: "view",
          actions: [
            assign(({ context }) => ({
              diffContent: context.draftContent,
              diffArray: diffStringToArray(context.draftContent),
            })),
            "saveEdits",
          ],
        },
        CANCEL: {
          target: "view",
          // doing this both here and when they click EDIT, seems redundant
          actions: assign(({ context }) => ({
            draftContent: context.diffContent,
          })),
        },
      },
    },
    // user chooses the base file to apply the diff to
    preApply: {
      on: {
        UPDATE_BASE_CONTENT: {
          actions: assign(({ event }) => ({
            baseContent: event.payload,
          })),
        },
        APPLY: {
          target: "apply",
        },
        CANCEL: {
          target: "view",
        },
      },
    },

    apply: {
      entry: assign(({ context }) => ({
        // reset so we can start concatting tokens
        applyResult: "",
      })),
      invoke: {
        src: "apply",
        input: ({ context }) => ({
          prompt: JSON.stringify({
            diff: diffArrayToString(context.diffArray),
            base: context.baseContent,
          }),
        }),
        onSnapshot: {
          actions: assign(({ context, event }) => ({
            applyResult: context.applyResult + (event.snapshot.context || ""),
          })),
        },
      },
      on: {
        UPDATE_APPLY_RESULT: {
          actions: assign(({ context, event }) => ({
            applyResult: event.payload,
          })),
        },
        CONFIRM: {
          target: "view",
          actions: "saveAsFile",
        },
        CANCEL: {
          target: "view",
        },
      },
    },
  },
})

export function DiffEditor({
  file,
  onChange,
  onStateChange,
  baseContent,
}: {
  file: { path: string; content: string; type: string }
  onChange: ({
    oldPath,
    newFile,
  }: {
    oldPath: string
    newFile: { path: string; content: string; type: string }
  }) => void
  onStateChange: (state: string) => void
  baseContent: string
}) {
  const fileContent = file?.content || ""

  const [state, send] = useMachine(
    diffStateMachine.provide({
      actions: {
        saveEdits: ({ event }) => {
          onChange({
            oldPath: file.path,
            newFile: {
              path: file.path,
              content: event.payload,
              type: "diff",
            },
          })
        },
        saveAsFile: ({ context }) => {
          onChange({
            oldPath: file.path,
            newFile: {
              path: file.path.replace(/\.diff$/, ""),
              content: context.applyResult,
              type: "file",
            },
          })
        },
        applyDiff: ({ context }) => {
          onChange({
            oldPath: file.path,
            newFile: {
              path: file.path,
              content: context.diffContent,
              type: "file",
            },
          })
        },
      },
    }),
    {
      input: {
        content: fileContent,
        baseContent,
      },
    },
  )

  const previousState = useRef(state.value)
  useEffect(() => {
    if (previousState.current !== state.value) {
      onStateChange(state.value)
      previousState.current = state.value
    }
  }, [state.value])

  const [prevBaseContent, setPrevBaseContent] = useState(baseContent)
  if (prevBaseContent !== baseContent) {
    setPrevBaseContent(baseContent)
    send({ type: "UPDATE_BASE_CONTENT", payload: baseContent })
  }

  return (
    <div>
      <div className="px-1 py-1 border-b border-sidebar-border flex gap-x-2 justify-between mb-2">
        <div className="flex items-center gap-x-2">
          <div className="font-mono px-3">{file.path}</div>
        </div>

        <div className="flex items-center gap-x-2">
          {state.matches("apply") ? (
            <>
              <Button
                type="button"
                variant="primary"
                className="px-4"
                onClick={() => send({ type: "CONFIRM" })}
              >
                <Icon name="check" className="-ml-2 size-4" />
                Confirm
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-tr-sm rounded-br-none px-4"
                onClick={() => send({ type: "CANCEL" })}
              >
                <Icon name="x" className="-ml-2 size-4" />
                Cancel
              </Button>
            </>
          ) : state.matches("preApply") ? (
            <>
              <Button
                type="button"
                variant="outline"
                className="px-4"
                onClick={() => send({ type: "APPLY" })}
              >
                <Icon name="play" className="-ml-2 size-4" />
                Continue
              </Button>
              <Button
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
                type="button"
                variant="primary"
                className="px-4"
                onClick={() =>
                  send({
                    type: "SAVE_EDITS",
                    payload: state.context.baseContent,
                  })
                }
              >
                <Icon name="play" className="-ml-2 size-4" />
                Save
              </Button>
              <Button
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
                type="button"
                variant="outline"
                className="px-4"
                onClick={() => send({ type: "APPLY_DIFF" })}
              >
                <Icon name="play" className="-ml-2 size-4" />
                Apply
              </Button>
              <Button
                type="button"
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

      {state.matches("apply") ? (
        <div className="mt-4">
          <CodeEditor
            value={state.context.applyResult}
            onChange={(value) =>
              send({
                type: "UPDATE_APPLY_RESULT",
                payload: value || "",
              })
            }
          />
        </div>
      ) : state.matches("preApply") ? (
        <div className="flex gap-x-4">
          <div className="grow">
            <CodeEditor
              value={state.context.baseContent}
              onChange={(value) =>
                send({
                  type: "UPDATE_BASE_CONTENT",
                  payload: value || "",
                })
              }
            />
          </div>
          <PreDiffViewWithTokens
            diffArray={state.context.diffArray}
            className="text-sm px-4 grow"
          />
        </div>
      ) : state.matches("edit") ? (
        <CodeEditor
          value={state.context.draftContent}
          onChange={(value) =>
            send({
              type: "UPDATE_EDIT",
              payload: value || "",
            })
          }
        />
      ) : state.matches("view") ? (
        <PreDiffViewWithTokens
          diffArray={state.context.diffArray}
          className="text-sm px-4"
        />
      ) : null}
    </div>
  )
}
