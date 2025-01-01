import { type LoaderFunctionArgs } from "@remix-run/node"
import { Form, useLoaderData } from "@remix-run/react"
import { Octokit } from "@octokit/rest"
import { invariant } from "@epic-web/invariant"
import { Button } from "#app/components/ui/button.js"
import { Icon } from "#app/components/icon.js"
import { ConnectedTerminal, Terminal } from "#app/components/terminal.js"
import { FadeIn } from "#app/components/fade-in.js"
import { cn } from "#app/utils/misc.js"
import { BreadcrumbHandle } from "#app/components/ui/breadcrumbs.js"
import { Heading } from "#app/components/heading.js"
import { Card, CardHeader } from "#app/components/ui/card.js"
import { CodeEditor } from "#app/components/code-editor.js"
import { useSpinDelay } from "spin-delay"
import { usePartyMessages } from "#app/party.js"
import {
  useFile,
  useFiles,
  useFileTree,
  useInstallFiles,
} from "#app/use-connection.js"
import { useCopyToClipboard } from "#app/utils/use-copy-to-clipboard.js"
import { useEffect, useState } from "react"
import { cachified } from "#app/cache.server.js"
import { getUser } from "#app/auth.server.js"
import { ChevronRight, ChevronDown } from "lucide-react"
import { processCollapsibleDiff } from "#app/utils/process-collapsible-diff.js"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarProvider,
  SidebarTrigger,
} from "#app/components/ui/sidebar.js"
import { FileTreeMenu } from "#app/components/file-tree-menu.js"
import { Input } from "#app/components/ui/input.js"
import { useCompletion } from "ai/react"

export const handle: BreadcrumbHandle = {
  breadcrumb: " ",
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { owner, repo, id } = params
  invariant(owner, "No owner found in params")
  invariant(repo, "No repo found in params")
  invariant(id, "No commit ID found in params")

  const user = await getUser(request)
  const octokit = new Octokit({
    auth: user?.tokens.access_token,
  })

  const { data } = await cachified({
    key: `commit-${owner}-${repo}-${id}`,
    getFreshValue: () =>
      octokit.repos.getCommit({
        owner,
        repo,
        ref: id,
      }),
    ttl: 1000 * 60 * 60 * 24, // 1 day
  })

  invariant(data.files, "No files found in commit")
  return { breadcrumbLabel: data.commit.message, commit: data }
}

export default function CommitPage() {
  const { commit } = useLoaderData<typeof loader>()
  const files = commit.files.map((file) => ({
    type: "file",
    path: file.filename,
    content: file.patch || "",
  }))

  return (
    <div className="p-6">
      <FadeIn show className="max-w-3xl">
        <div className="flex justify-between items-center">
          <Heading>{commit.commit.message || "Unnamed Commit"}</Heading>
        </div>

        <div>
          {files.map((file) => (
            <LinePatchCard
              key={file.path}
              name={file.path}
              file={file}
              className="mt-4"
            />
          ))}
        </div>
      </FadeIn>
    </div>
  )
}

export function LinePatchCard({
  name,
  file,
  className,
}: {
  name: string
  file: { path: string; content: string; language: string }
  className?: string
}) {
  const [state, setState] = useState<"idle" | "diff" | "rebase" | "success">(
    "idle",
  )
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const selectedFileName = selectedFile
  const handleFileSelect = (path: string) => {
    setSelectedFile(path)
  }

  const sections = processCollapsibleDiff(file.content.split("\n"))

  const [collapsedSections, setCollapsedSections] = useState(
    sections.map(() => true),
  )

  // Initialize inclusion state for each changed section with null for indeterminate
  const [includedSections, setIncludedSections] = useState<(boolean | null)[]>(
    sections.map(() => null),
  )

  const toggleCollapse = (index: number) => {
    setCollapsedSections((prev) =>
      prev.map((collapsed, i) => (i === index ? !collapsed : collapsed)),
    )
  }

  const excludeSection = (index: number) => {
    setIncludedSections((prev) =>
      prev.map((included, i) => (i === index ? false : included)),
    )
  }

  const [baseContent, setBaseContent] = useState("")
  const [hasRebased, setHasRebased] = useState(false)
  const { completion, isLoading, complete } = useCompletion({
    api: "/api/rebase",
  })

  if (isLoading && !hasRebased) {
    setHasRebased(true)
  }

  console.log(
    sections
      .filter((section) => section.type !== "unchanged")
      .map((section) => section.lines.join("\n"))
      .join("\n"),
  )

  return (
    <Card className={cn("font-mono py-0", className)}>
      <CardHeader
        className={cn(
          "justify-between px-2 py-2 ",
          state === "rebase" && "shadow-smooth border-b",
        )}
      >
        <div className="flex items-center gap-x-2 px-2">
          <span className="font-bold">patch</span>
          <span className="font-medium">{name}</span>
        </div>

        <div className="flex gap-2">
          {state === "idle" && (
            <Button
              type="button"
              variant="outline"
              className="shadow-smooth"
              onClick={() => {
                setState("diff")
              }}
            >
              <Icon name="play" className="-ml-2 size-4" />
              apply
            </Button>
          )}

          {state === "diff" && (
            <>
              <Button
                type="button"
                variant="outline"
                className="shadow-smooth"
                onClick={() => {
                  setState("idle")
                }}
              >
                <Icon name="x" className="-ml-2 size-4" />
                cancel
              </Button>

              <Button
                type="button"
                variant="outline"
                className="shadow-smooth"
                onClick={() => {
                  setState("rebase")
                }}
              >
                <Icon name="play" className="-ml-2 size-4" />
                continue
              </Button>
            </>
          )}

          {state === "rebase" && (
            <>
              <Button
                type="button"
                variant="outline"
                className="shadow-smooth"
                onClick={() => {
                  setState("idle")
                }}
              >
                <Icon name="x" className="-ml-2 size-4" />
                cancel
              </Button>

              {hasRebased ? (
                <Button
                  type="button"
                  variant="outline"
                  className="shadow-smooth"
                  onClick={() => {
                    setState("success")
                  }}
                >
                  <Icon name="check" className="-ml-2 size-4" />
                  accept
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="shadow-smooth"
                  onClick={() => {
                    complete(
                      JSON.stringify({
                        diff: sections
                          .filter((section) => section.type !== "unchanged")
                          .map((section) => section.lines.join("\n"))
                          .join("\n"),
                        base: baseContent,
                      }),
                    )
                  }}
                >
                  <Icon name="cooking-pot" className="-ml-2 size-4" />
                  apply
                </Button>
              )}
            </>
          )}
        </div>
      </CardHeader>

      {state !== "rebase" ? (
        <pre className={cn("overflow-auto text-sm pt-4")}>
          {sections.map((section, sectionIndex) => {
            if (section.type === "changed") {
              return (
                <div key={sectionIndex} className="relative">
                  {state === "diff" &&
                    includedSections[sectionIndex] === null && (
                      <div className="absolute -top-2 right-2 flex gap-2 z-10">
                        <Button
                          type="button"
                          size="sm"
                          className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200"
                          onClick={() => excludeSection(sectionIndex)}
                        >
                          {"Exclude"}
                        </Button>
                      </div>
                    )}
                  {section.lines.map((line, lineIndex) => {
                    const inclusionState = includedSections[sectionIndex]
                    if (inclusionState === false) {
                      // If not included, hide green additions and turn red ones into unchanged
                      return line.startsWith("+") ? null : (
                        <Line
                          key={lineIndex}
                          line={" " + line.slice(1)}
                          diffExtracted={true}
                        />
                      )
                    }
                    // Default behavior: show all lines
                    return (
                      <Line
                        key={lineIndex}
                        line={line}
                        diffExtracted={state === "diff"}
                      />
                    )
                  })}
                </div>
              )
            }

            if (section.lines.length < 4 || !collapsedSections[sectionIndex]) {
              return section.lines.map((line, lineIndex) => (
                <Line
                  key={lineIndex}
                  line={line}
                  diffExtracted={state === "diff"}
                />
              ))
            }

            return (
              <div key={sectionIndex}>
                <button
                  onClick={() => toggleCollapse(sectionIndex)}
                  className={cn(
                    "flex items-center gap-2 text-neutral-500 bg-neutral-200/50  w-full",
                    "hover:text-neutral-700 hover:bg-neutral-200/70",
                  )}
                >
                  {collapsedSections[sectionIndex] ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                  {section.lines.length} unchanged lines
                </button>

                {!collapsedSections[sectionIndex] &&
                  section.lines.map((line, lineIndex) => (
                    <Line
                      key={lineIndex}
                      line={line}
                      className="bg-neutral-200/50"
                      diffExtracted={state === "diff"}
                    />
                  ))}
              </div>
            )
          })}
        </pre>
      ) : hasRebased ? (
        <div className="flex-1">
          <div className="px-1 py-1 border-b flex gap-x-2 items-center mb-2">
            <h2 className="text-sm text-muted-foreground">{selectedFile}</h2>
          </div>
          <CodeEditor options={{ readOnly: true }} value={completion} />
        </div>
      ) : (
        <FileViewer
          selectedFile={selectedFileName}
          onFileSelect={handleFileSelect}
          onChange={(value) => setBaseContent(value || "")}
          className="overflow-hidden"
        />
      )}
    </Card>
  )
}

function FileViewer({
  selectedFile,
  onFileSelect,
  onChange,
  className,
}: {
  selectedFile: string | null
  onFileSelect: (path: string) => void
  onChange: (value: string) => void
  className?: string
}) {
  const [content, setContent] = useState("")
  const [search, setSearch] = useState("")

  const { files } = useFileTree()
  const { state, file } = useFile(selectedFile)

  useEffect(() => {
    if (state === "success" && file) {
      setContent(file.content)
      onChange(file.content)
    }
  }, [state, file])

  return (
    <div className={cn("overflow-hidden", className)}>
      <SidebarProvider className="relative">
        <div className="flex h-full grow">
          <Sidebar className="border-r absolute border-sidebar-border">
            <SidebarHeader className="p-0 border-b">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="text-sm font-medium h-9 text-muted-foreground rounded-none border-none focus:ring-0"
                placeholder="Search"
              />
            </SidebarHeader>
            <SidebarContent>
              <FileTreeMenu
                paths={files.filter((path) =>
                  path.toLowerCase().includes(search.toLowerCase()),
                )}
                onFileSelect={(path) => onFileSelect(path)}
              />
            </SidebarContent>
          </Sidebar>
          <div className="flex-1">
            <div className="px-1 py-1 border-b flex gap-x-2 items-center mb-2">
              <SidebarTrigger />
              <h2 className="text-sm text-muted-foreground">{selectedFile}</h2>
            </div>
            <CodeEditor
              value={content}
              onChange={(value) => {
                setContent(value || "")
                onChange(value || "")
              }}
            />
          </div>
        </div>
      </SidebarProvider>
    </div>
  )
}

export function FileCard({
  file,
  className,
}: {
  file: { path: string; content: string; language: string }
  className?: string
}) {
  return (
    <Card className={cn("font-mono", className)}>
      <CardHeader>
        <Heading>{file.path}</Heading>
      </CardHeader>
      <CodeEditor
        language={file.language}
        value={file.content}
        options={{ readOnly: true }}
      />
    </Card>
  )
}

export function Line({
  line,
  className,
}: {
  line: string
  className?: string
}) {
  return (
    <div
      className={cn(
        "px-4 transition-all duration-100 ",
        {
          "text-green-600 dark:text-green-600 bg-green-500/5":
            line.startsWith("+"),
          "text-red-600 dark:text-red-600 bg-red-500/5": line.startsWith("-"),
          "opacity-30": !line.startsWith("+") && !line.startsWith("-"),
        },
        className,
      )}
      style={{ whiteSpace: "pre-wrap" }}
    >
      {line}
    </div>
  )
}
