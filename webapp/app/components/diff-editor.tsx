import { Button } from "#app/components/ui/button.js"
import { Icon } from "#app/components/icon.js"
import { CodeDiffEditor, CodeEditor } from "#app/components/code-editor.js"
import { useEffect, useRef, useState, useMemo } from "react"
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
import { useFile, useFileTree } from "#app/use-connection.js"
import { cn } from "#app/utils/misc.js"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarProvider,
} from "./ui/sidebar"
import { Input } from "./ui/input"
import { FileTreeMenu } from "./file-tree-menu"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"
import { Card } from "./ui/card"

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
      selectedProjectPath: string
    },
    context: {} as {
      diffArray: Array<DiffOperation>
      applyResult: string
      baseContent: string
      selectedProjectPath: string
      initialSelectedProjectPath: string
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
    selectedProjectPath: input.selectedProjectPath,
    initialSelectedProjectPath: input.selectedProjectPath || "",
  }),
  initial: "view",
  states: {
    view: {
      entry: assign(({ context }) => ({
        selectedProjectPath: context.initialSelectedProjectPath,
      })),
      on: {
        APPLY: [
          {
            target: "preApply",
            guard: ({ context }) => !context.baseContent,
          },
          {
            target: "applying",
          },
        ],
        UPDATE_BASE_CONTENT: {
          actions: assign(({ event }) => ({
            baseContent: event.payload,
          })),
        },
      },
    },
    preApply: {
      on: {
        UPDATE_BASE_CONTENT: {
          actions: assign(({ event }) => ({
            baseContent: event.payload,
          })),
        },
        APPLY: {
          target: "applying",
          guard: ({ context }) => Boolean(context.baseContent),
        },
        CANCEL: {
          target: "view",
        },
        UPDATE_SELECTED_PATH: {
          actions: assign(({ event }) => ({
            selectedProjectPath: event.payload,
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
          actions: ["saveAsFile", "collapse"],
        },
        CANCEL: {
          target: "view",
        },
      },
    },
  },
})

function IgnoreDropdown({
  path,
  version,
  onIgnore,
}: {
  path: string
  version: string
  onIgnore: (version: string, ignorePattern: string | null) => void
}) {
  const getIgnoreOptions = (path: string) => {
    const segments = path.split("/")
    const fileName = segments[segments.length - 1]
    const extension = fileName.includes(".") ? fileName.split(".").pop() : ""

    const options = [null] as Array<string | null>

    // Add directory paths
    for (let depth = segments.length - 1; depth >= 0; depth--) {
      options.push(segments.slice(0, depth + 1).join("/"))
    }

    // Add extension pattern
    if (extension) {
      options.push(`*.${extension}`)
    }

    return options
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="primary" className="shadow-smooth">
          <Icon name="x" className="-ml-2 size-4" />
          ignore
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {getIgnoreOptions(path).map((option) => (
          <DropdownMenuItem
            key={option || "this-change"}
            className="font-mono"
            onClick={() => onIgnore(version, option)}
          >
            <span className="text-muted-foreground">Ignore </span>
            {option || "this change"}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function AutoDiffEditor({
  file,
  onSaveFile,
  version,
  onIgnore,
  className,
  collapsed = false,
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
  onIgnore: (version: string, ignorePattern: string | null) => void
  className?: string
  collapsed?: boolean
}) {
  const trimmedPath = file.path.replace(/\.diff$/, "")
  const [isExpanded, setIsExpanded] = useState(!collapsed)
  const { files: projectFiles } = useFileTree()

  const [search, setSearch] = useState("")

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
              path: trimmedPath,
              content: context.applyResult,
              type: "file",
            },
          })
        },
        collapse: () => {
          setIsExpanded(false)
        },
      },
    }),
    {
      input: {
        content: file.content,
        baseContent: "",
        selectedProjectPath: trimmedPath,
      },
    },
  )

  const {
    state: fileState,
    file: projectFile,
    dir,
  } = useFile(state.context.selectedProjectPath)

  const baseContent = fileState === "success" ? projectFile?.content || "" : ""

  // Track previous baseContent to update machine input
  const [prevBaseContent, setPrevBaseContent] = useState(baseContent)
  if (prevBaseContent !== baseContent) {
    setPrevBaseContent(baseContent)
    send({ type: "UPDATE_BASE_CONTENT", payload: baseContent })
  }

  // Watch for file state changes and update base content when ready
  const [prevFileState, setPrevFileState] = useState(fileState)
  if (prevFileState !== fileState) {
    setPrevFileState(fileState)
    if (fileState === "success") {
      send({
        type: "UPDATE_BASE_CONTENT",
        payload: projectFile?.content || "",
      })
    }
  }

  return (
    <Card className={className}>
      <div className="flex h-full grow overflow-hidden">
        <div className="max-w-full grow">
          <div className="p-2 flex gap-x-2 justify-between">
            <div className="flex items-center gap-x-2 px-1">
              <span
                className={cn(
                  "text-lg",
                  fileState === "loading" && "animate-spin",
                )}
              >
                ❖
              </span>
              <div className="font-mono">{file.path}</div>
            </div>

            {!isExpanded ? (
              <div className="flex items-center gap-x-2">
                <Button
                  type="button"
                  variant="outline"
                  className="shadow-smooth"
                  onClick={() => setIsExpanded(true)}
                >
                  <Icon name="play" className="-ml-2 size-4" />
                  Ignored
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-x-2">
                {state.matches("preApply") ? (
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
                      className="shadow-smooth"
                      onClick={() => send({ type: "CANCEL" })}
                    >
                      <Icon name="x" className="-ml-2 size-4" />
                      Cancel
                    </Button>
                  </>
                ) : state.matches("applying") ? (
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
                    <Button
                      type="button"
                      variant="outline"
                      className="shadow-smooth"
                      onClick={() => send({ type: "APPLY" })}
                    >
                      <Icon name="play" className="-ml-2 size-4" />
                      apply
                    </Button>
                    <IgnoreDropdown
                      path={file.path}
                      version={version}
                      onIgnore={(version, ignorePattern) => {
                        // TODO: don't think I need the version here
                        setIsExpanded(false)
                        onIgnore(version, ignorePattern)
                      }}
                    />
                  </>
                )}
              </div>
            )}
          </div>

          <div className="px-4 font-mono text-sm text-muted-foreground">
            {projectFile?.path ? (
              <p>
                {dir}/{projectFile.path}
              </p>
            ) : (
              <p> {file.path} not found </p>
            )}
          </div>

          {isExpanded && (
            <div className="mt-2">
              {state.matches("preApply") ? (
                <SidebarProvider className="relative mt-2">
                  <div className="flex h-full grow">
                    <Sidebar className="border-r absolute border-sidebar-border">
                      <SidebarHeader className="p-0 border-b border-sidebar-border">
                        <Input
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          className="font-medium h-9 text-muted-foreground rounded-none border-none focus:ring-0"
                          placeholder="Search"
                        />
                      </SidebarHeader>
                      <SidebarContent>
                        <FileTreeMenu
                          paths={projectFiles
                            .map((file) => file.replace(/^\//, ""))
                            .filter((path) =>
                              path.toLowerCase().includes(search.toLowerCase()),
                            )}
                          onFileSelect={(path) => {
                            send({
                              type: "UPDATE_SELECTED_PATH",
                              payload: path,
                            })
                            send({
                              type: "UPDATE_BASE_CONTENT",
                              payload:
                                state === "success"
                                  ? projectFile?.content || ""
                                  : "",
                            })
                          }}
                        />
                      </SidebarContent>
                    </Sidebar>
                    <div className="flex-1 w-full">
                      <div className="grow ">
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
                    </div>
                  </div>
                </SidebarProvider>
              ) : state.matches("applying") || state.matches("confirmable") ? (
                <CodeDiffEditor
                  original={state.context.baseContent}
                  modified={state.context.applyResult}
                />
              ) : (
                <DifftasticView content={file.content} className="text-sm" />
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

function DifftasticView({
  className,
  content,
}: {
  className?: string
  content: string
}) {
  const chunks = useMemo(() => {
    const lines = content.split("\n")
    const result = []
    let currentChunk = []
    let currentType = ""

    for (const line of lines) {
      console.log("line", `"${line}"`)
      let cursor = 0
      let lineNumber = ""
      let originalWhitespace = ""

      // Capture original whitespace
      while (cursor < line.length && line[cursor] === " ") {
        originalWhitespace += line[cursor]
        cursor++
      }

      // Parse line number
      while (cursor < line.length && /\d/.test(line[cursor])) {
        lineNumber += line[cursor]
        cursor++
      }

      // Skip single space after line number if present
      if (cursor < line.length && line[cursor] === " ") {
        cursor++
      }

      // Get content and determine type, preserving all remaining content
      const lineContent = line.slice(cursor)
      const type = lineContent.startsWith("+")
        ? "add"
        : lineContent.startsWith("-")
          ? "delete"
          : "context"

      // Start new chunk if type changes
      if (type !== currentType && currentChunk.length > 0) {
        result.push({ type: currentType, lines: currentChunk })
        currentChunk = []
      }

      currentType = type
      currentChunk.push({
        lineNumber,
        content: lineContent,
        whitespace: originalWhitespace,
      })
    }

    // Push final chunk
    if (currentChunk.length > 0) {
      result.push({ type: currentType, lines: currentChunk })
    }

    return result
  }, [content])

  const renderLineContent = (content: string) => {
    const parts = []
    let currentText = ""
    let cursor = 0

    while (cursor < content.length) {
      if (content[cursor] === "[" && content[cursor + 1] === "+") {
        // Push any text before the diff marker
        if (currentText) {
          parts.push({ type: "text", content: currentText })
          currentText = ""
        }

        cursor += 3 // Skip [+
        let diffContent = ""
        while (
          cursor < content.length &&
          !(content[cursor] === "+" && content[cursor + 1] === "]")
        ) {
          diffContent += content[cursor]
          cursor++
        }
        cursor += 3 // Skip +]

        parts.push({ type: "add", content: diffContent })
      } else if (content[cursor] === "[" && content[cursor + 1] === "-") {
        // Push any text before the diff marker
        if (currentText) {
          parts.push({ type: "text", content: currentText })
          currentText = ""
        }

        cursor += 3 // Skip [-
        let diffContent = ""
        while (
          cursor < content.length &&
          !(content[cursor] === "-" && content[cursor + 1] === "]")
        ) {
          diffContent += content[cursor]
          cursor++
        }
        cursor += 3 // Skip -]

        parts.push({ type: "delete", content: diffContent })
      } else {
        currentText += content[cursor]
        cursor++
      }
    }

    // Push any remaining text
    if (currentText) {
      parts.push({ type: "text", content: currentText })
    }

    return parts.map((part, i) => {
      if (part.type === "add") {
        return (
          <span key={i} className="bg-green-500/20">
            {part.content}
          </span>
        )
      }
      if (part.type === "delete") {
        return (
          <span key={i} className="bg-red-500/20">
            {part.content}
          </span>
        )
      }
      return <span key={i}>{part.content}</span>
    })
  }

  return (
    <pre className={className}>
      {chunks.map((chunk, i) => (
        <div
          key={i}
          className={cn("transition-all duration-100", {
            "text-green-600 dark:text-green-600 bg-green-500/5":
              chunk.type === "add",
            "text-red-600 dark:text-red-600 bg-red-500/5":
              chunk.type === "delete",
            "opacity-30": chunk.type === "context",
          })}
        >
          {chunk.lines.map((line, j) => (
            <div key={j} className="px-4" style={{ whiteSpace: "pre-wrap" }}>
              {line.whitespace}
              {line.lineNumber && (
                <span className="text-muted-foreground">
                  {line.lineNumber}{" "}
                </span>
              )}
              {renderLineContent(line.content)}
            </div>
          ))}
        </div>
      ))}
    </pre>
  )
}
