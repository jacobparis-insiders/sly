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
import { useSpinDelay } from "spin-delay"
import { useFile, useFileTree, useInstallFiles } from "#app/use-connection.js"
import { useCopyToClipboard } from "#app/utils/use-copy-to-clipboard.js"
import { useState } from "react"
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
import { matchesState } from "xstate"
import { FileEditor } from "#app/components/file-editor.js"
import { DiffEditor } from "#app/components/diff-editor.js"

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

  const [fileViewerState, setFileViewerState] = useState<"idle" | "preApply">(
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
              if (matchesState(fileViewerState, "diff.preApply")) {
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
              matchesState(fileViewerState, "diff.preApply")
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
