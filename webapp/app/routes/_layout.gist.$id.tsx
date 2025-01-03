import { type LoaderFunctionArgs } from "@remix-run/node"
import { Form, useLoaderData } from "@remix-run/react"
import { Octokit } from "@octokit/rest"
import { invariant } from "@epic-web/invariant"
import { Button } from "#app/components/ui/button.js"
import { Icon } from "#app/components/icon.js"
import { ConnectedTerminal } from "#app/components/terminal.js"
import { FadeIn } from "#app/components/fade-in.js"
import { cn } from "#app/utils/misc.js"
import { BreadcrumbHandle } from "#app/components/ui/breadcrumbs.js"
import { Heading } from "#app/components/heading.js"
import { Card } from "#app/components/ui/card.js"
import { CodeEditor } from "#app/components/code-editor.js"
import { useSpinDelay } from "spin-delay"
import { useFile, useFileTree, useInstallFiles } from "#app/use-connection.js"
import { useCopyToClipboard } from "#app/utils/use-copy-to-clipboard.js"
import { useEffect, useRef, useState } from "react"
import { cachified } from "#app/cache.server.js"
import { getUser } from "#app/auth.server.js"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarProvider,
} from "#app/components/ui/sidebar.js"
import { FileTreeMenu } from "#app/components/file-tree-menu.js"
import { Input } from "#app/components/ui/input.js"
import {
  tokenize,
  diffTokens,
  diffArrayToString,
  diffStringToArray,
  DiffOperation,
} from "@pkgless/diff"
import { PreDiffViewWithTokens } from "#app/components/pre-diff-view.js"
import { setup, assign, matchesState, fromObservable } from "xstate"
import { useMachine } from "@xstate/react"
import { createFetchObservable } from "#app/utils/observable-fetch.js"

export const handle: BreadcrumbHandle = {
  breadcrumb: " ",
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { id } = params
  invariant(id, "No gist ID found in params")

  const user = await getUser(request)
  const octokit = new Octokit({
    auth: user?.tokens.access_token,
  })
  const { data } = await cachified({
    key: `gist-${id}`,
    getFreshValue: () => octokit.gists.get({ gist_id: id }),
    ttl: 1000 * 60 * 60 * 24, // 1 day
  })

  invariant(data.files, "No files found in gist")
  return {
    breadcrumbLabel: data.description,
    gist: {
      id: data.id,
      description: data.description,
    },
    files:
      Object.entries(data.files).map(([filename, file]) => ({
        type: "file",
        path: filename.replaceAll("\\", "/"),
        content: file!.content,
        language: file!.language,
      })) || [],
  }
}

export default function GistPage() {
  const { gist, files: initialFiles } = useLoaderData<typeof loader>()
  const [files, setFiles] = useState(initialFiles)
  const [copied, copyToClipboard] = useCopyToClipboard()
  const { installFiles, state: installState } = useInstallFiles()
  const isRunning = useSpinDelay(installState === "loading", {
    delay: 100,
    minDuration: 1000,
  })
  const [confirmState, setConfirmState] = useState(false)
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null)

  const [fileViewerState, setFileViewerState] = useState<"idle" | "applying">(
    "idle",
  )
  console.log(fileViewerState)
  const { files: _projectFiles } = useFileTree()
  const projectFiles = _projectFiles.map((file) => ({
    path: file.replace(/^\//, ""),
    content: "",
    type: "file",
  }))
  const [selectedProjectPath, setSelectedProjectPath] = useState<string | null>(
    null,
  )
  const { state, file: projectFile } = useFile(selectedProjectPath)

  const baseContent = selectedProjectPath
    ? state === "success"
      ? projectFile?.content || ""
      : "Loading…"
    : ""

  if (!gist) return <div className="p-6">No gist found</div>

  const installCommand = `npx pkgless add gist ${gist.id}`

  const hasPatchFiles = files.some((file) => file.path.endsWith(".diff"))
  const selectedFile = files.find((file) => file.path === selectedFilePath)
  return (
    <div className="p-6">
      <FadeIn show className="max-w-3xl">
        <div className="flex justify-between items-center">
          <Heading>{gist.description || "Unnamed Gist"}</Heading>
        </div>

        <ConnectedTerminal>{installCommand}</ConnectedTerminal>

        <div className="flex gap-x-2 items-center mt-2">
          {confirmState ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setConfirmState(false)
                }}
              >
                Apply patches
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const filesWithoutPatches = files.filter(
                    (file) => file.type !== "patch",
                  )
                  installFiles({ files: filesWithoutPatches })
                  setConfirmState(false)
                }}
              >
                Install without patches
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                className={cn(
                  "shadow-smooth transition-colors gap-4",
                  isRunning &&
                    "hover:bg-black bg-black text-white hover:text-white",
                )}
                onClick={() => {
                  if (hasPatchFiles) {
                    setConfirmState(true)
                  } else {
                    installFiles({ files })
                  }
                }}
              >
                <Icon name="play" className="-ml-2 size-4" />
                Run
              </Button>

              <Button
                type="button"
                variant="outline"
                className={cn(
                  "shadow-smooth transition-colors",
                  copied &&
                    "hover:bg-white border-green-500/40 hover:border-green-500/40 hover:text-green-800",
                )}
                onClick={() => copyToClipboard(installCommand)}
              >
                <Icon
                  name={copied ? "copy-check" : "copy"}
                  className={cn("-ml-2 size-4")}
                />
                copy
              </Button>

              <Form method="POST" action="/new">
                <input type="hidden" name="intent" value="new-pkg" />
                <input
                  type="hidden"
                  name="description"
                  value={gist.description || ""}
                />
                {files.map((file, index) => (
                  <>
                    <input
                      type="hidden"
                      name={`files[${index}].name`}
                      value={file.path}
                    />
                    <input
                      type="hidden"
                      name={`files[${index}].content`}
                      value={file.content}
                    />
                    <input
                      type="hidden"
                      name={`files[${index}].language`}
                      value={file.language?.toLowerCase()}
                    />
                    <input
                      type="hidden"
                      name={`files[${index}].type`}
                      value={file.type}
                    />
                  </>
                ))}
                <Button
                  type="submit"
                  variant="outline"
                  className="shadow-smooth transition-colors"
                >
                  <Icon name="plus-circle" className="-ml-2 size-4" />
                  duplicate
                </Button>
              </Form>

              <Button
                variant="outline"
                className="shadow-smooth transition-colors"
                asChild
              >
                <a
                  href={gist.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Icon name="github" className="-ml-2 size-4" />
                  view on github
                </a>
              </Button>
            </>
          )}
        </div>

        <Card className="mt-4 pt-0 shadow-smooth">
          <FileViewer
            selectedFile={selectedFile}
            baseContent={baseContent}
            onFileSelect={(path: string) => {
              if (matchesState(fileViewerState, "diff.applying")) {
                setSelectedProjectPath(path)
              } else {
                setSelectedFilePath(path)
              }
            }}
            onChange={({ oldPath, newFile }) => {
              setFiles((prevFiles) =>
                prevFiles.map((file) =>
                  file.path === oldPath ? { ...file, ...newFile } : file,
                ),
              )

              if (oldPath !== newFile.path) {
                setSelectedFilePath(newFile.path)
              }
            }}
            className="rounded-md "
            files={
              matchesState(fileViewerState, "diff.applying")
                ? projectFiles
                : files
            }
            onStateChange={(state) => {
              setFileViewerState(state)
            }}
          />
        </Card>
      </FadeIn>
    </div>
  )
}

function FileViewer({
  selectedFile,
  baseContent,
  onFileSelect,
  onChange,
  className,
  files,
  onStateChange,
}: {
  baseContent: string
  selectedFile: { path: string; content: string; type: string } | null
  onFileSelect: (path: string) => void
  onChange: ({
    oldPath,
    newFile,
  }: {
    oldPath: string
    newFile: { path: string; content: string; type: string }
  }) => void
  className?: string
  files: Array<{ path: string; content: string; type: string }>
  onStateChange: (state: string) => void
}) {
  const [search, setSearch] = useState("")
  const [prevFiles, setPrevFiles] = useState(files)
  if (prevFiles !== files) {
    setPrevFiles(files)
    setSearch("")
  }
  return (
    <div className={cn("overflow-hidden", className)}>
      <SidebarProvider className="relative">
        <div className="flex h-full grow">
          <Sidebar className="border-r absolute border-sidebar-border">
            <SidebarHeader className="p-0 border-b border-sidebar-border">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="text-sm font-medium h-9 text-muted-foreground rounded-none border-none focus:ring-0"
                placeholder="Search"
              />
            </SidebarHeader>
            <SidebarContent>
              <FileTreeMenu
                paths={files
                  .filter(({ path }) =>
                    path.toLowerCase().includes(search.toLowerCase()),
                  )
                  .map(({ path }) => path)}
                onFileSelect={(path) => onFileSelect(path)}
              />
            </SidebarContent>
          </Sidebar>
          <div className="flex-1">
            {selectedFile ? (
              selectedFile.type === "file" ? (
                <FileEditor
                  key={selectedFile.path}
                  file={selectedFile}
                  onChange={onChange}
                />
              ) : (
                <DiffEditor
                  key={selectedFile.path}
                  file={selectedFile}
                  onChange={onChange}
                  onStateChange={(state) => {
                    onStateChange(`diff.${state}`)
                  }}
                  baseContent={baseContent}
                />
              )
            ) : null}
          </div>
        </div>
      </SidebarProvider>
    </div>
  )
}

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
        CANCEL_EDIT: {
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

function FileEditor({
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
                onClick={() => send({ type: "CANCEL_EDIT" })}
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

const rebaseActor = fromObservable(({ input }) =>
  // helper function that streams each chunk into an observable
  createFetchObservable({
    url: "/api/rebase",
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
      sourceContent: string
      diffArray: Array<DiffOperation>
      rebaseResult: string
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
    initEdit: assign(({ context }) => ({
      draftContent: context.diffContent,
      baseContent: context.sourceContent,
    })),
  },
  actors: {
    rebase: rebaseActor,
  },
}).createMachine({
  context: ({ input }) => ({
    diffContent: input.content,
    sourceContent: input.baseContent,
    diffArray: diffStringToArray(input.content),
    rebaseResult: "",
    draftContent: input.content,
    baseContent: input.baseContent,
  }),
  initial: "view",
  states: {
    view: {
      on: {
        TOGGLE_EDIT: {
          target: "edit",
          actions: "initEdit",
        },
        APPLY_DIFF: "applying",
      },
    },
    edit: {
      on: {
        UPDATE_EDIT: {
          actions: assign(({ context, event }) => ({
            draftContent: event.payload,
            baseContent: event.payload,
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
        CANCEL_EDIT: {
          target: "view",
        },
      },
    },
    applying: {
      on: {
        UPDATE_BASE: {
          actions: assign(({ event }) => ({
            baseContent: event.payload,
          })),
        },
        SAVE: {
          target: "rebase",
          actions: assign(({ event }) => ({
            diffContent: event.payload,
            sourceContent: event.payload,
          })),
        },
        CANCEL: {
          target: "view",
        },
      },
    },
    rebase: {
      entry: assign(({ context }) => ({
        rebaseResult: "",
      })),
      invoke: {
        src: "rebase",
        input: ({ context }) => ({
          prompt: JSON.stringify({
            diff: diffArrayToString(context.diffArray),
            base: context.sourceContent,
          }),
        }),
        onSnapshot: {
          actions: assign(({ context, event }) => ({
            rebaseResult: context.rebaseResult + (event.snapshot.context || ""),
          })),
        },
      },
      on: {
        UPDATE_REBASE: {
          actions: assign(({ context, event }) => ({
            rebaseResult: event.payload,
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

function DiffEditor({
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
              content: context.rebaseResult,
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
    send({ type: "UPDATE_BASE", payload: baseContent })
  }

  return (
    <div>
      <div className="px-1 py-1 border-b border-sidebar-border flex gap-x-2 justify-between mb-2">
        <div className="flex items-center gap-x-2">
          <h2 className="text-sm text-muted-foreground">{file.path}</h2>
        </div>

        <div className="flex items-center gap-x-2">
          {state.matches("rebase") ? (
            <>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-tr-sm rounded-br-none px-4"
                onClick={() => send({ type: "CONFIRM" })}
              >
                <Icon name="check" className="-ml-2 size-4" />
                Confirm
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
          ) : state.matches("applying") ? (
            <>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-tr-sm rounded-br-none px-4"
                onClick={() =>
                  send({
                    type: "SAVE",
                    payload: state.context.baseContent,
                  })
                }
              >
                <Icon name="play" className="-ml-2 size-4" />
                Apply
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
                    payload: state.context.baseContent,
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
                onClick={() => send({ type: "CANCEL_EDIT" })}
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
                onClick={() => send({ type: "APPLY_DIFF" })}
              >
                <Icon name="apply" className="-ml-2 size-4" />
                Apply
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

      {state.matches("rebase") ? (
        <div className="mt-4">
          <CodeEditor
            value={state.context.rebaseResult}
            onChange={(value) =>
              send({
                type: "UPDATE_REBASE",
                payload: value || "",
              })
            }
          />
        </div>
      ) : state.matches("applying") ? (
        <div className="flex gap-x-4">
          <div className="grow">
            <CodeEditor
              value={state.context.baseContent}
              onChange={(value) =>
                send({
                  type: "UPDATE_BASE",
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
