import { Button } from "#app/components/ui/button.js"
import { Icon } from "#app/components/icon.js"
import { CodeEditor } from "#app/components/code-editor.js"
import { useEffect, useRef, useState } from "react"
import {
  diffArrayToString,
  diffStringToArray,
  DiffOperation,
  diffTokens,
  tokenize,
} from "@pkgless/diff"
import { PreDiffViewWithTokens } from "#app/components/pre-diff-view.js"
import { setup, assign, fromObservable } from "xstate"
import { useMachine } from "@xstate/react"
import { createFetchObservable } from "#app/utils/observable-fetch.js"
import { useFile } from "#app/use-connection.js"
import { cn } from "#app/utils/misc.js"

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
    <div className="max-w-full">
      <div className="p-2 flex gap-x-2 justify-between mb-2">
        <div className="flex items-center gap-x-2">
          <div className="font-mono px-2">{file.path}</div>
        </div>

        <div className="flex items-center gap-x-2">
          {state.matches("apply") ? (
            <>
              <Button
                type="button"
                variant="primary"
                className="shadow-smooth"
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
                className="shadow-smooth"
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
                className="shadow-smooth"
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
                className="shadow-smooth"
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
            className="text-sm  grow"
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
          className="text-sm"
        />
      ) : null}
    </div>
  )
}

const autoDiffStateMachine = setup({
  types: {
    input: {} as {
      content: string
      baseContent: string
    },
    context: {} as {
      diffArray: Array<DiffOperation>
      applyResult: string
      baseContent: string
      resultDiffArray: Array<DiffOperation>
    },
  },
  actors: {
    apply: applyActor,
  },
}).createMachine({
  context: ({ input }) => ({
    diffArray: diffStringToArray(input.content),
    baseContent: input.baseContent,
    applyResult: "",
    resultDiffArray: [],
  }),
  initial: "view",
  states: {
    view: {
      on: {
        APPLY: "applying",
        UPDATE_BASE_CONTENT: {
          actions: assign(({ event }) => ({
            baseContent: event.payload,
          })),
        },
      },
    },
    applying: {
      entry: assign(() => ({
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
        onDone: {
          target: "confirmable",
          actions: assign(({ context }) => ({
            resultDiffArray: diffTokens({
              a: tokenize({
                content: context.baseContent,
                language: "typescript",
              }),
              b: tokenize({
                content: context.applyResult,
                language: "typescript",
              }),
            }),
          })),
        },
      },
      on: {
        CANCEL: {
          target: "view",
        },
        UPDATE_BASE_CONTENT: {
          actions: assign(({ event }) => ({
            baseContent: event.payload,
          })),
        },
      },
    },
    confirmable: {
      on: {
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

export function AutoDiffEditor({
  file,
  onSaveFile,
  version,
  onSkip,
}: {
  file: { path: string; content: string; type: string }
  onSaveFile: ({
    oldPath,
    newFile,
  }: {
    oldPath: string
    newFile: { path: string; content: string; type: string }
  }) => void
  version: string
  onSkip: (version: string) => void
}) {
  const { state: fileState, file: projectFile } = useFile(
    file.path.replace(/\.diff$/, ""),
  )
  const baseContent = fileState === "success" ? projectFile?.content || "" : ""

  const diffArray = diffStringToArray(file.content)
  const hasChanges = diffArray.some(
    (token) => token.type === "insert" || token.type === "delete",
  )

  const [state, send] = useMachine(
    autoDiffStateMachine.provide({
      actions: {
        saveAsFile: ({ context }) => {
          console.log("saveAsFile", context.applyResult)
          onSaveFile({
            oldPath: file.path,
            newFile: {
              path: file.path.replace(/\.diff$/, ""),
              content: context.applyResult,
              type: "file",
            },
          })
        },
      },
    }),
    {
      input: {
        content: file.content,
        baseContent,
      },
    },
  )

  // Track previous baseContent to update machine input
  const [prevBaseContent, setPrevBaseContent] = useState(baseContent)
  if (prevBaseContent !== baseContent) {
    setPrevBaseContent(baseContent)
    send({ type: "UPDATE_BASE_CONTENT", payload: baseContent })
  }

  return (
    <div className="max-w-full grow">
      <div className="p-2 flex gap-x-2 justify-between mb-2">
        <div className="flex items-center gap-x-2 px-1">
          <span
            className={cn("text-lg", fileState === "loading" && "animate-spin")}
          >
            ❖
          </span>
          <div className="font-mono">{file.path}</div>
        </div>

        {fileState === "error" ? (
          <div className="text-sm text-red-500">
            Could not find matching file to apply diff. Please create the file
            first.
          </div>
        ) : (
          <div className="flex items-center gap-x-2">
            {state.matches("applying") ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="shadow-smooth"
                  onClick={() => send({ type: "CANCEL" })}
                >
                  <Icon name="x" className="-ml-2 size-4" />
                  Cancel
                </Button>
              </>
            ) : state.matches("confirmable") ? (
              <>
                <Button
                  type="button"
                  variant="primary"
                  className="shadow-smooth"
                  onClick={() => send({ type: "CONFIRM" })}
                >
                  <Icon name="check" className="-ml-2 size-4" />
                  Confirm
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="shadow-smooth"
                  onClick={() => send({ type: "CANCEL" })}
                >
                  <Icon name="x" className="-ml-2 size-4" />
                  Cancel
                </Button>
              </>
            ) : (
              <>
                {hasChanges && baseContent ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="shadow-smooth"
                    onClick={() => send({ type: "APPLY" })}
                  >
                    <Icon name="play" className="-ml-2 size-4" />
                    Apply
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  className="shadow-smooth"
                  onClick={() => onSkip(version)}
                >
                  Skip
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {state.matches("applying") ? (
        <CodeEditor value={state.context.applyResult} readOnly />
      ) : state.matches("confirmable") ? (
        <div className="flex gap-x-4">
          {/* <div className="grow">
            <CodeEditor value={state.context.applyResult} readOnly />
          </div> */}
          <div className="grow">
            <PreDiffViewWithTokens
              contextPadding={4}
              diffArray={state.context.resultDiffArray}
              className="text-sm"
            />
          </div>
        </div>
      ) : (
        <PreDiffViewWithTokens
          diffArray={state.context.diffArray}
          className="text-sm"
        />
      )}
    </div>
  )
}
