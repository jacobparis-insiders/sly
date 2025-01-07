import { redirect, type LoaderFunctionArgs } from "@remix-run/node"
import { useLoaderData } from "@remix-run/react"
import { invariant } from "@epic-web/invariant"
import { useState } from "react"
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
import { tokenize, diffTokens } from "@pkgless/diff"
import { Card, CardHeader } from "#app/components/ui/card.js"
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
import { DiffEditor } from "#app/components/diff-editor.js"
import { matchesState } from "xstate"

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

    // Process each file that has a GitHub source
    const registryData = {
      files: await Promise.all(
        item.files.map(async (fileConfig) => {
          invariant(fileConfig.source, "File source is required")
          if (!fileConfig.source?.startsWith("https://github.com/")) {
            throw new Error("Only GitHub URLs are supported at this time")
          }

          const githubUrlParts = fileConfig.source.split("/")
          const owner = githubUrlParts[3]
          const repo = githubUrlParts[4]
          const blobIndex = githubUrlParts.indexOf("blob")
          const branch = githubUrlParts[blobIndex + 1]
          const filePath = githubUrlParts.slice(blobIndex + 2).join("/")

          invariant(owner && repo && filePath, "Invalid GitHub URL format")

          try {
            // Get current file content - using the branch as ref
            const { data: fileData } = await cachified({
              key: `github-file-${owner}-${repo}-${filePath}-${branch}`,
              getFreshValue: () =>
                octokit.repos.getContent({
                  owner,
                  repo,
                  path: filePath,
                  ref: branch,
                }),
              ttl: 1000 * 60 * 60 * 24,
            })

            // Get commit history for the file - using the branch as ref
            const { data: commits } = await cachified({
              key: `github-commits-${owner}-${repo}-${filePath}-${branch}`,
              getFreshValue: () =>
                octokit.repos.listCommits({
                  owner,
                  repo,
                  path: filePath,
                  sha: branch,
                  per_page: 100,
                }),
              ttl: 1000 * 60 * 60 * 24,
            })

            // Get historical versions of the file
            const history = await Promise.all(
              commits
                // we fetched in newest-to-oldest
                // .reverse()
                .map(async (commit) => {
                  const { data: commitData } = await cachified({
                    key: `github-commit-${owner}-${repo}-${commit.sha}-${filePath}`,
                    getFreshValue: () =>
                      octokit.repos.getCommit({
                        owner,
                        repo,
                        ref: commit.sha,
                      }),
                    ttl: 1000 * 60 * 60 * 24,
                  })

                  const fileData = commitData.files?.find(
                    (file) => file.filename === filePath,
                  )
                  console.log("File data from commit:", {
                    filePath,
                    sha: commit.sha,
                    fileData: {
                      sha: fileData?.sha,
                    },
                  })

                  if (!fileData) {
                    console.log(
                      `No file data found for ${filePath} in commit ${commit.sha}`,
                    )
                    throw new Error(`No file data found for ${filePath}`)
                  }

                  // Fetch file content using fileData.sha instead of commit.sha
                  const historicalContent = await cachified({
                    key: `github-file-${owner}-${repo}-${filePath}-${fileData.sha}`,
                    forceFresh: true,
                    getFreshValue: async () => {
                      const response = await fetch(fileData.raw_url)
                      console.log("Raw URL fetch response:", {
                        sha: fileData?.sha,
                        status: response.status,
                        ok: response.ok,
                        raw_url: fileData.raw_url,
                      })

                      if (!response.ok) {
                        throw new Error(
                          `Failed to fetch raw content: ${response.statusText}`,
                        )
                      }
                      const content = await response.text()
                      return {
                        content: Buffer.from(content).toString("base64"),
                        sha: fileData.sha,
                      }
                    },
                    ttl: 1000 * 60 * 60 * 24,
                  })

                  if (!historicalContent) {
                    throw new Error(
                      `No historical content found for ${filePath} at commit ${fileData?.sha}`,
                    )
                  }

                  return {
                    version: fileData.sha,
                    content: Buffer.from(
                      historicalContent.content,
                      "base64",
                    ).toString(),
                    timestamp: new Date(
                      commit.commit.author?.date || "",
                    ).getTime(),
                  }
                }),
            ).then((versions) => versions.filter(Boolean).reverse()) // Remove null entries

            return {
              path: fileConfig.path,
              content: Buffer.from(fileData.content, "base64").toString(),
              version: fileData.sha,
              history,
            }
          } catch (error) {
            if (error.status === 404) {
              throw new Error(
                `File not found at ${fileConfig.source}. Please verify the URL is correct and the file exists in the repository.`,
              )
            }
            throw error
          }
        }),
      ),
    }

    console.log({ registryFiles: registryData.files })
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
      const fileConfig = item.files?.find((f) => f.path === file.name)

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
        versionDiffs,
        baseVsRegistryDiff,
        type: "file", // determines whether files start as file or diff
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

export default function ItemPage() {
  const {
    index,
    files: initialFiles,
    registryFiles,
    config,
    item,
  } = useLoaderData<typeof loader>()
  const [files, setFiles] = useState(initialFiles)

  if (!files.length) return <div className="p-6">No item files found</div>
  console.log(files)
  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold mb-2">
            {item?.name || "Unnamed Item"}
          </h1>
        </div>
      </div>

      <div className="space-y-6">
        {files.map((file) => (
          <FileCard
            key={file.name}
            index={index}
            file={file}
            registryFile={registryFiles.find((f) => f.path === file.path)}
            currentVersion={null}
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

function SliderView({
  file,
  versions,
  version,
  onSetVersion,
}: {
  file: any
  versions: any
  version?: string
  onSetVersion: (version: string) => void
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
          onSetVersion(selectedVersion.version)
        }}
        variant="outline"
      >
        Set version
      </Button>

      <Card className={cn("font-mono py-0")}>
        <CardHeader
          className={cn(
            "flex flex-col justify-between px-2 py-2 shadow-smooth border-b",
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

        <div className="font-mono text-sm">
          {selectedDiff ? (
            <PreDiffViewWithTokens diffArray={selectedDiff.diffArray} />
          ) : (
            <div className="px-4 py-2">
              File contents match registry exactly
            </div>
          )}
        </div>
      </Card>
    </>
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

  const fileConfig = config.value.items[index].files.find(
    (f) => f.path === file.path,
  )

  const [isSliderView, setIsSliderView] = useState<boolean>(
    fileConfig.commit ? false : true,
  )

  const versions = registryFile?.history || []

  const baseContent = getHistoricalVersionContentFromHistory(
    versions,
    fileConfig.version,
  )

  const isLatestVersion = fileConfig.version === registryFile.version

  return (
    <div key={file.name} className="w-full max-w-4xl">
      {isSliderView ? (
        <SliderView
          file={file}
          versions={versions}
          version={fileConfig.version}
          onSetVersion={(version) => {
            fileConfig.version = version
            updateConfig({
              value: config.value,
            })
            setIsSliderView(false)
          }}
        />
      ) : (
        <>
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsSliderView(true)}
          >
            Change version
          </Button>
          <Card className="mt-4 pt-0 shadow-smooth">
            <FileViewer
              selectedFile={file}
              baseContent={baseContent}
              onFileSelect={() => {}}
              onChange={({ newFile }) => {
                onFileChange(newFile)
              }}
              files={[
                {
                  path: file.path,
                  content: file.content,
                  type: "file",
                },
              ]}
              onStateChange={() => {}}
            />
          </Card>
        </>
      )}
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

  const currentBaseContent = selectedProjectPath
    ? state === "success"
      ? projectFile?.content || ""
      : "Loading…"
    : baseContent

  return (
    <div className={cn("overflow-hidden", className)}>
      <SidebarProvider className="relative">
        <div className="flex h-full grow">
          {showSidebar && (
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
                    onStateChange(`diff.${state}`)
                  }}
                  baseContent={currentBaseContent}
                />
              )
            ) : null}
          </div>
        </div>
      </SidebarProvider>
    </div>
  )
}
