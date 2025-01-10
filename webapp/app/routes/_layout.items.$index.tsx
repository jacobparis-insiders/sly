import { redirect, type LoaderFunctionArgs } from "@remix-run/node"
import { useLoaderData } from "@remix-run/react"
import { invariant } from "@epic-web/invariant"
import { Fragment, useState } from "react"
import {
  getConnection,
  useUpdateConfig,
  useFileTree,
  useFile,
} from "#app/use-connection.js"
import { Button } from "#app/components/ui/button.tsx"
import { Slider } from "#app/components/ui/slider.tsx"
import { format } from "date-fns"
import { cn } from "#app/utils/misc.js"
import { PreDiffViewWithTokens } from "#app/components/pre-diff-view.js"
import { tokenize, diffTokens, diffArrayToString } from "@pkgless/diff"
import { Card, CardContent, CardHeader } from "#app/components/ui/card.js"
import { Octokit } from "@octokit/rest"
import { cachified } from "#app/cache.server.js"
import { getUser } from "#app/auth.server.js"
import { SidebarContent } from "#app/components/ui/sidebar.js"
import {
  Sidebar,
  SidebarHeader,
  SidebarProvider,
} from "#app/components/ui/sidebar.js"
import { Input } from "#app/components/ui/input.js"
import { FileTreeMenu } from "#app/components/file-tree-menu.js"
import { FileEditor } from "#app/components/file-editor.js"
import { AutoDiffEditor, DiffEditor } from "#app/components/diff-editor.js"
import { Heading } from "#app/components/heading.js"

type GitHubFileInfo = {
  owner: string
  repo: string
  branch: string
  path: string
}

async function parseGitHubUrl(url: string): Promise<GitHubFileInfo> {
  if (!url.startsWith("https://github.com/")) {
    throw new Error("Only GitHub URLs are supported at this time")
  }

  const parts = url.split("/")
  const owner = parts[3]
  const repo = parts[4]
  const blobIndex = parts.indexOf("blob")
  const branch = parts[blobIndex + 1]
  const path = parts.slice(blobIndex + 2).join("/")

  invariant(owner && repo && path, "Invalid GitHub URL format")
  return { owner, repo, branch, path }
}

async function getFileContent({
  owner,
  repo,
  path,
  ref,
  octokit,
}: GitHubFileInfo & { ref: string; octokit: Octokit }) {
  const { data: fileData } = await cachified({
    key: `github-file-${owner}-${repo}-${path}-${ref}`,
    getFreshValue: () =>
      octokit.repos.getContent({
        owner,
        repo,
        path,
        ref,
      }),
    ttl: 1000 * 60 * 60 * 24,
  })

  return {
    content: Buffer.from(fileData.content, "base64").toString(),
    sha: fileData.sha,
  }
}

async function getFileHistory({
  owner,
  repo,
  path,
  branch,
  octokit,
}: GitHubFileInfo & { octokit: Octokit }) {
  console.log("Getting file history")
  const commits = await getAllCommitsWithRenames({
    owner,
    repo,
    path,
    branch,
    octokit,
  })

  console.log("Got file history", commits)
  return commits
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  const index = params.index
  invariant(index, "Item index is required")

  const connection = await getConnection(request)
  try {
    const config = await connection?.getConfig()
    if (!config) throw redirect("/")

    const item = config.value.items[index]
    invariant(item, "Item not found")
    invariant(item.files, "Item files are required")

    const itemFiles = await connection?.getFiles(item.files.map((f) => f.path))
    invariant(itemFiles, "No files found for item")

    const user = await getUser(request)
    const octokit = new Octokit({
      auth: user?.tokens.access_token,
    })

    const registryData = {
      files: await Promise.all(
        item.files.map(async (fileConfig) => {
          invariant(fileConfig.source, "File source is required")

          const fileInfo = await parseGitHubUrl(fileConfig.source)
          const currentContent = await getFileContent({
            ...fileInfo,
            ref: fileInfo.branch,
            octokit,
          })
          const history = await getFileHistory({ ...fileInfo, octokit })

          return {
            source: fileConfig.source,
            path: fileConfig.path,
            content: currentContent.content,
            version: currentContent.sha,
            history,
          }
        }),
      ),
    }

    // registryFiles only have path and content right now

    // Compute diffs for each file and each version
    const filesWithDiffs = itemFiles.map((file) => {
      const registryFile = registryData.files.find((f) => f.path === file.path)
      const versions = registryFile?.history || []

      const versionDiffs = versions.map((version) => {
        const diffArray = diffTokens({
          a: tokenize({
            content: version.content,
            language: "typescript",
          }),
          b: tokenize({
            content: file.content,
            language: "typescript",
          }),
        })
        return {
          version: version.version,
          diffArray,
        }
      })

      // Find the file configuration with a matching filename
      const fileConfig = item.files.find((f) => f.path === file.path)
      // Generate diff for base vs registry
      const baseContent = getHistoricalVersionContentFromHistory(
        versions,
        fileConfig?.version,
      )
      const baseVsRegistryDiff = diffTokens({
        a: tokenize({
          content: baseContent,
          language: "typescript",
        }),
        b: tokenize({
          content: registryFile.content,
          language: "typescript",
        }),
      })

      return {
        ...file,
        source: registryFile?.source,
        version: fileConfig?.version,
        versionDiffs,
        baseVsRegistryDiff,
        type: "file",
      }
    })

    return {
      index,
      files: filesWithDiffs,
      registryFiles: registryData.files,
      config,
      item,
    }
  } finally {
    connection?.close()
  }
}

async function getAllCommitsWithRenames({
  owner,
  repo,
  path,
  branch,
  octokit,
}: {
  owner: string
  repo: string
  path: string
  branch: string
  octokit: Octokit
}) {
  let attemptedFilenames = new Set()
  let fileHistory = []
  let currentPath = path

  let whileCount = 0
  while (whileCount++ < 100) {
    if (attemptedFilenames.has(currentPath)) {
      console.log("Already attempted this path", currentPath)
      console.log("Attempted filenames", attemptedFilenames)
      break
    }

    attemptedFilenames.add(currentPath)
    const { data: commits } = await cachified({
      key: `github-commits-${owner}-${repo}-${currentPath}-${branch}`,
      getFreshValue: () =>
        octokit.repos.listCommits({
          owner,
          repo,
          path: currentPath,
          sha: branch,
          per_page: 100,
        }),
      ttl: 1000 * 60 * 60 * 24,
    })

    console.log(`Found ${commits.length} commits for ${currentPath}`)

    // Process each commit to get file content
    for (const commit of commits) {
      const { data: commitData } = await cachified({
        key: `github-commit-${owner}-${repo}-${commit.sha}`,
        getFreshValue: () =>
          octokit.repos.getCommit({
            owner,
            repo,
            ref: commit.sha,
          }),
        ttl: 1000 * 60 * 60 * 24,
      })

      let fileData = commitData.files?.find(
        (file) => file.filename === currentPath,
      )

      // Handle large commits with pagination
      if (!fileData && commitData.files?.length === 300) {
        console.log("Large commit, fetching additional pages")
        let page = 2

        while (!fileData && page <= 10) {
          const { data: fullCommitData } = await cachified({
            key: `github-commit-${owner}-${repo}-${commit.sha}-page-${page}`,
            getFreshValue: () =>
              octokit.request("GET /repos/{owner}/{repo}/commits/{ref}", {
                owner,
                repo,
                ref: commit.sha,
                per_page: 300,
                page,
              }),
            ttl: 1000 * 60 * 60 * 24,
          })

          if (!fullCommitData.files?.length) break

          fileData = fullCommitData.files.find(
            (file) => file.filename === currentPath,
          )
          page++
        }
      }

      if (fileData) {
        // Get the file content at this commit
        const { data: fileContent } = await cachified({
          key: `github-file-content-${owner}-${repo}-${path}-${commit.sha}`,
          getFreshValue: () =>
            octokit.repos.getContent({
              owner,
              repo,
              path: currentPath,
              ref: commit.sha,
            }),
          ttl: 1000 * 60 * 60 * 24,
        })

        // Decode base64 content
        const content = Buffer.from(fileContent.content, "base64").toString()

        if (fileHistory.at(-1)?.content !== content) {
          fileHistory.push({
            path: currentPath,
            version: commit.sha,
            content,
            timestamp: new Date(commitData.commit.author?.date || ""),
          })
        }

        if (fileData.previous_filename) {
          currentPath = fileData.previous_filename
        }
      }
    }

    if (!commits.length) break
  }

  if (whileCount >= 100) {
    console.log("Hit max depth")
  }

  return fileHistory.filter(Boolean).reverse()
}

export default function ItemPage() {
  const {
    index,
    files: initialFiles,
    registryFiles,
    config,
    item,
  } = useLoaderData<typeof loader>()
  const [files, setFiles] = useState(initialFiles)
  console.log("files", files)
  if (!files.length) return <div className="p-6">No item files found</div>

  // Calculate status summary
  const fileStatuses = files.map((file) => {
    const registryFile = registryFiles.find((f) => f.path === file.path)
    const fileConfig = item.files?.find((f) => f.path === file.path)
    const isUpToDate = fileConfig?.version === registryFile?.version
    return isUpToDate ? "up-to-date" : "outdated"
  })

  const statusSummary = {
    total: files.length,
    upToDate: fileStatuses.filter((s) => s === "up-to-date").length,
    outdated: fileStatuses.filter((s) => s === "outdated").length,
  }

  return (
    <div className="p-6">
      <Card className="mb-8">
        <CardHeader>
          <Heading>{item?.name || "Unnamed Item"}</Heading>
          {item?.description && (
            <p className="text-sm text-muted-foreground">{item.description}</p>
          )}
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground font-mono">
            <span className="font-bold text-foreground">
              {statusSummary.total}
            </span>
            <span className=""> files </span>
            <span className="font-bold text-foreground">
              {statusSummary.outdated}
            </span>
            <span className=""> updates </span>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        {files.map((file) => (
          <FileCard
            key={file.name}
            index={index}
            file={file}
            registryFile={registryFiles.find((f) => f.path === file.path)}
            config={config}
            onFileChange={(newFile) => {
              console.log("onFileChange", newFile)
              setFiles(
                files.map((f) =>
                  f.path === file.path
                    ? { ...f, ...newFile, path: f.path } // Only update the content
                    : f,
                ),
              )
            }}
          />
        ))}
      </div>
    </div>
  )
}

function FileCard({
  index,
  file,
  registryFile,
  config,
  onFileChange,
}: {
  index: string
  file: any
  registryFile: any
  config: any
  onFileChange: (newFile: { path: string; content: string }) => void
}) {
  const { updateConfig } = useUpdateConfig()
  const [showUpdatePreview, setShowUpdatePreview] = useState(false)
  const [updateDiffArray, setUpdateDiffArray] = useState<any>(null)

  const fileConfig = config.value.items[index].files.find(
    (f) => f.path === file.path,
  )

  const [isSliderView, setIsSliderView] = useState<boolean>(
    fileConfig.version ? false : true,
  )

  const versions = registryFile?.history || []
  const hasUpdates = fileConfig.version !== registryFile.version

  const baseContent = getHistoricalVersionContentFromHistory(
    versions,
    fileConfig.version,
  )

  return (
    <div key={file.name} className="w-full max-w-4xl">
      {isSliderView ? (
        <SliderView
          file={file}
          versions={versions}
          version={fileConfig.version}
          onSetVersion={({ version, diffArray }) => {
            fileConfig.version = version
            updateConfig({
              value: config.value,
            })
            setIsSliderView(false)
            console.log("setUpdateDiffArray", diffArray)
            setUpdateDiffArray(diffArray)
          }}
        />
      ) : (
        <>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="shadow-smooth"
              onClick={() => setIsSliderView(true)}
            >
              Change version
            </Button>
            {hasUpdates && (
              <Button
                type="button"
                variant="outline"
                className="text-orange-500 hover:text-orange-600"
                onClick={() => setShowUpdatePreview(true)}
              >
                Updates available
              </Button>
            )}
          </div>

          {showUpdatePreview && (
            <Card className="mt-4 pt-0 shadow-smooth">
              <UpdateViewer
                selectedFile={{
                  ...file,
                  content: updateDiffArray
                    ? diffArrayToString(updateDiffArray)
                    : "",
                }}
                baseContent={file.content}
                onChange={({ newFile }) => {
                  onFileChange(newFile)
                }}
              />
            </Card>
          )}

          <Card className="mt-4 pt-0 shadow-smooth">
            <FileViewer
              selectedFile={file}
              baseContent={baseContent}
              onFileSelect={() => {}}
              onChange={({ newFile }) => {
                onFileChange(newFile)
              }}
              onSelectVersion={() => {
                setIsSliderView(true)
              }}
            />
          </Card>
        </>
      )}
    </div>
  )
}

function SliderView({
  file,
  versions,
  version,
  onSetVersion,
}: {
  file: any
  versions: any
  version?: string
  onSetVersion: (version: { version: string; diffArray: any }) => void
}) {
  // Guard against empty versions array
  if (!versions?.length) {
    return <div>No versions available</div>
  }

  const [selectedVersionIndex, setSelectedVersionIndex] = useState<number>(
    () => {
      if (version) {
        return versions.findIndex((entry) => entry.version === version) || 0
      } else {
        const exactMatchIndex = versions.findIndex(
          (version) => version.content === file.content,
        )
        return exactMatchIndex !== -1 ? exactMatchIndex : 0
      }
    },
  )

  const handleSliderChange = (value: number[]) => {
    setSelectedVersionIndex(value[0])
  }

  // Ensure selectedVersionIndex is within bounds
  const boundedIndex = Math.min(
    Math.max(selectedVersionIndex, 0),
    versions.length - 1,
  )
  const selectedVersion = versions[boundedIndex]
  const selectedDiff =
    selectedVersion &&
    file.versionDiffs.find((diff) => diff.version === selectedVersion.version)

  return (
    <>
      <Button
        type="button"
        onClick={() => {
          // when we set the version, we should compute the diff between this version and the latest version.
          // When setting version, compute diff between selected and latest
          const selectedContent = versions[boundedIndex].content
          const latestContent = versions.at(-1).content

          // TODO: long running process
          const diffArray = diffTokens({
            a: tokenize({
              content: selectedContent,
              language: "typescript",
            }),
            b: tokenize({
              content: latestContent,
              language: "typescript",
            }),
          })

          onSetVersion({
            version: selectedVersion.version,
            diffArray,
          })
        }}
        variant="outline"
      >
        Set version
      </Button>

      <Card className={cn("font-mono py-0 mt-4")}>
        <CardHeader
          className={cn(
            "flex flex-col justify-between px-2 py-2 shadow-smooth border-b border-border",
          )}
        >
          <div className="flex items-center gap-x-2 px-2">
            <span className="font-medium">{file.path}</span>
          </div>
          <div className="flex items-center gap-2 px-2 mt-2">
            <div className="space-y-4 w-full">
              <p className="text-sm text-muted-foreground">
                Adjust the slider until the diff only shows your own
                customizations.
              </p>
              <div className="relative z-10">
                <Slider
                  id="version-slider"
                  min={0}
                  max={versions.length - 1}
                  step={1}
                  value={[selectedVersionIndex]}
                  onValueChange={handleSliderChange}
                  className="w-full"
                />
                <div className="absolute w-full flex justify-between top-3 px-[9px] -z-10">
                  {versions.map((_, index) => (
                    <div
                      key={index}
                      className={cn("border-l-2 h-2 border-neutral-300")}
                    />
                  ))}
                </div>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                {versions[selectedVersionIndex].timestamp ? (
                  <span>
                    {format(
                      versions[selectedVersionIndex].timestamp,
                      "MMM d, yyyy",
                    )}
                  </span>
                ) : null}
                {versions.at(-1).timestamp ? (
                  <span>
                    {format(versions.at(-1).timestamp, "MMM d, yyyy")}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </CardHeader>

        <div className="font-mono px-4 py-2">
          {selectedDiff ? (
            <PreDiffViewWithTokens
              diffArray={selectedDiff.diffArray}
              className="text-sm"
            />
          ) : (
            <div>File contents match registry exactly</div>
          )}
        </div>
      </Card>
    </>
  )
}

function FileViewer({
  selectedFile,
  baseContent,
  onFileSelect,
  onChange,
  className,
  onSelectVersion,
}: {
  baseContent: string
  selectedFile: {
    path: string
    content: string
    type: string
    source?: string
  } | null
  onFileSelect: (path: string) => void
  onChange: ({
    oldPath,
    newFile,
  }: {
    oldPath: string
    newFile: { path: string; content: string; type: string }
  }) => void
  className?: string
  onSelectVersion: () => void
}) {
  console.log("selected", selectedFile)
  const [search, setSearch] = useState("")
  const [fileViewerState, setFileViewerState] = useState<"idle" | "preApply">(
    "idle",
  )
  const { files: _projectFiles } = useFileTree()
  const [selectedProjectPath, setSelectedProjectPath] = useState<string | null>(
    null,
  )
  const { state, file: projectFile } = useFile(selectedProjectPath)

  const projectFiles = _projectFiles.map((file) => ({
    path: file.replace(/^\//, ""),
    content: "",
    type: "file",
  }))

  const showSidebar = fileViewerState === "preApply"
  const MaybeSidebarProvider = showSidebar ? SidebarProvider : Fragment
  const currentBaseContent = selectedProjectPath
    ? state === "success"
      ? projectFile?.content || ""
      : "Loading…"
    : baseContent

  return (
    <div className={cn("overflow-hidden", className)}>
      <MaybeSidebarProvider className="relative">
        <div className="flex h-full grow">
          {showSidebar && (
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
                    .filter(({ path }) =>
                      path.toLowerCase().includes(search.toLowerCase()),
                    )
                    .map(({ path }) => path)}
                  onFileSelect={(path) => {
                    setSelectedProjectPath(path)
                    onFileSelect(path)
                  }}
                />
              </SidebarContent>
            </Sidebar>
          )}
          <div className="flex-1">
            {selectedFile ? (
              selectedFile.type === "file" ? (
                <FileEditor
                  key={selectedFile.path}
                  file={selectedFile}
                  onSelectVersion={onSelectVersion}
                  onChange={({ newFile }) => {
                    onChange({
                      oldPath: selectedFile.path,
                      newFile: {
                        ...newFile,
                        path: selectedFile.path,
                      },
                    })
                  }}
                />
              ) : (
                <DiffEditor
                  key={selectedFile.path}
                  file={selectedFile}
                  onChange={({ newFile }) => {
                    onChange({
                      oldPath: selectedFile.path,
                      newFile: {
                        ...newFile,
                        path: selectedFile.path,
                      },
                    })
                  }}
                  onStateChange={(state) => {
                    setFileViewerState(state as "idle" | "preApply")
                  }}
                  baseContent={currentBaseContent}
                />
              )
            ) : null}
          </div>
        </div>
      </MaybeSidebarProvider>
    </div>
  )
}

function UpdateViewer({
  selectedFile,
  baseContent,
  onChange,
  updateDiffArray,
}: {
  baseContent: string
  selectedFile: {
    path: string
    content: string
    type: string
    source?: string
  }
  onChange: ({
    oldPath,
    newFile,
  }: {
    oldPath: string
    newFile: { path: string; content: string; type: string }
  }) => void
  updateDiffArray: any
}) {
  return (
    <div className="">
      <div className="flex h-full grow overflow-hidden">
        <AutoDiffEditor
          file={selectedFile}
          // onChange={({ newFile }) => {
          //   onChange({
          //     oldPath: selectedFile.path,
          //     newFile: {
          //       ...newFile,
          //       path: selectedFile.path,
          //     },
          //   })
          // }}
          baseContent={baseContent}
          onStateChange={(state) => {
            console.log("state", state)
          }}
        />
      </div>
    </div>
  )
}

function getHistoricalVersionContentFromHistory(
  history: Array<{ version: string; content: string }>,
  version: string,
): string {
  const versionEntry = history.find((entry) => entry.version === version)
  return versionEntry ? versionEntry.content : ""
}
