import { type LoaderFunctionArgs } from "@remix-run/node"
import { useLoaderData, useParams, useNavigate, Link } from "@remix-run/react"
import { Octokit } from "@octokit/rest"
import { invariant } from "@epic-web/invariant"
import { Button } from "#app/components/ui/button.js"
import { Icon } from "#app/components/icon.js"
import { FadeIn } from "#app/components/fade-in.js"
import { Heading } from "#app/components/heading.js"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#app/components/ui/card.js"
import { cache, cachified, lru } from "#app/cache.server.js"
import { getUser } from "#app/auth.server.js"
import { FileStructureGrid } from "#app/utils/skyline/file-structure-grid.js"
import { Slider } from "#app/components/ui/slider.js"
import { format } from "date-fns"
import { useMemo, useState } from "react"
import {
  useFileTree,
  useOptionalCli,
  useUpdateConfig,
} from "#app/use-connection.js"
import { getConnection } from "#app/use-connection.js"
import {
  fetchRepositoryData,
  fetchContributors,
  fetchCommits,
  fetchRepositoryContents,
  fetchCommitFiles,
  fetchCommitDetails,
  fetchFileContent,
  fetchCommitsForPath,
  fetchFileContentAtCommit,
} from "#app/utils/octokit.server.ts"
import { getFileGridWidth } from "#app/utils/skyline/generate-file-grid.js"
import { cn } from "#app/utils/misc.js"
import { Checkbox } from "#app/components/ui/checkbox.js"
import { Label } from "#app/components/ui/label.js"

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { owner, repo } = params
  invariant(owner, "No owner found in params")
  invariant(repo, "No repo found in params")

  const user = await getUser(request)
  const connection = await getConnection(request)
  try {
    const config = await connection?.getConfig()

    const octokit = new Octokit({
      auth: user?.tokens.access_token,
    })

    const repoData = await fetchRepositoryData({ octokit, owner, repo })

    const [contributors, allCommits, contents] = await Promise.all([
      fetchContributors({ octokit, owner, repo }),
      fetchCommits({ octokit, owner, repo }),
      fetchRepositoryContents({
        octokit,
        owner,
        repo,
        branch: repoData.data.default_branch,
      }),
    ])

    invariant(repoData.data, "No repository data found")

    for (const commit of allCommits) {
      const [commitFiles, commitDetails] = await Promise.all([
        fetchCommitFiles({ octokit, owner, repo, commitSha: commit.sha }),
        fetchCommitDetails({ octokit, owner, repo, commitSha: commit.sha }),
      ])

      commit.files = commitFiles

      commit.affectedFiles =
        commitDetails.files?.map((file) => {
          return {
            path: file.filename,
            status: file.status,
          }
        }) || []
    }

    return {
      repo: {
        ...repoData.data,
        contributors_count: contributors.length,
        all_commits: allCommits.map((commit) => ({
          sha: commit.sha,
          message: commit.commit.message,
          date: commit.commit.author.date,
          time_ago: new Date(commit.commit.author.date).toLocaleString(),
          files: commit.files,
          affectedFiles: commit.affectedFiles,
        })),
      },
      paths: contents,
      config: config?.value,
    }
  } finally {
    connection?.close()
  }
}

export default function RepoPage() {
  const { repo, paths, config } = useLoaderData<typeof loader>()
  const { updateConfig } = useUpdateConfig()
  const { cwd } = useOptionalCli()
  const projectFiles = useFileTree()
  const ignorePatterns = config?.ignore || []

  const [hideNonMatching, setHideNonMatching] = useState(false)
  const [hideIgnored, setHideIgnored] = useState(false)

  // Convert projectFiles.files to a Set for faster lookup
  const projectFilesSet = useMemo(
    () => new Set(projectFiles.files?.map((file) => file.slice(1))),
    [projectFiles.files],
  )

  const commits = repo.all_commits
    .filter((a) => !a.message?.includes("skip ci"))
    .map((commit) => {
      const hasMatchingFiles = commit.affectedFiles.some((file) => {
        if (
          hideIgnored &&
          ignorePatterns.some((pattern) => file.path.includes(pattern))
        ) {
          return false
        }
        if (hideNonMatching && !projectFilesSet.has(file.path)) {
          return false
        }
        return true
      })

      return {
        ...commit,
        hasMatchingFiles,
      }
    })
    .reverse()

  const currentVersionIndex = commits.findIndex(
    (commit) => commit.sha === config.template.version,
  )
  const [selectedCommitIndex, setSelectedCommitIndex] = useState(() => {
    if (!currentVersionIndex) return 0
    if (!commits[currentVersionIndex]) return 0

    return currentVersionIndex
  })

  const updatesAvailable =
    currentVersionIndex === -1
      ? commits.length
      : commits.length - currentVersionIndex

  const handleSliderChange = (value: number[]) => {
    setSelectedCommitIndex(value[0])
  }

  const selectedCommit = commits[selectedCommitIndex] || commits[0]

  // Find the next commit after the current version
  const nextVersionIndex =
    currentVersionIndex === -1 ? 0 : currentVersionIndex - 1
  const nextCommit = commits[nextVersionIndex]

  // Filter paths based on ignore settings from config
  const ignoredPaths = selectedCommit.files.filter((path) =>
    ignorePatterns.some((pattern) => path.includes(pattern)),
  )

  const includedPaths = selectedCommit.files.filter((path) => {
    if (
      hideIgnored &&
      ignorePatterns.some((pattern) => path.includes(pattern))
    ) {
      return false
    }
    if (hideNonMatching && !projectFilesSet.has(path)) {
      return false
    }
    return true
  })

  const numberOfMatchingFiles = selectedCommit.files.filter((path) => {
    if (!projectFilesSet.has(path)) {
      return true
    }
    return false
  }).length

  const [skylineState, setSkylineState] = useState<"idle" | "version">("idle")
  const [showSettings, setShowSettings] = useState(false)
  if (!repo) return <div className="p-6">No repository found</div>

  return (
    <div className="p-6">
      <FadeIn show className="max-w-3xl">
        <Card className="">
          <CardHeader className="flex">
            <Heading>{repo.full_name}</Heading>
            <div className="flex gap-x-2 items-start">
              <span>⭐ {repo.stargazers_count}</span>
              <span>{repo.license?.spdx_id || "No License"}</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-muted-foreground font-mono">
              <p className="mb-4">{repo.description}</p>
              <strong className="font-bold text-foreground">
                {repo.contributors_count}
              </strong>
              <span className=""> contributors </span>
              <strong className="font-bold text-foreground">
                {repo.all_commits.length}
              </strong>
              <span className=""> commits</span>
            </div>
          </CardContent>
        </Card>

        <Button variant="outline" className="shadow-smooth mt-4" asChild>
          <a href={repo.html_url} target="_blank" rel="noopener noreferrer">
            <Icon name="github" className="-ml-2 size-4" />
            View on GitHub
          </a>
        </Button>

        <Card className="mt-6 pt-0 overflow-hidden">
          <CardHeader className="flex-col bg-neutral-100 pt-2 rounded-t-lg shadow-smooth border-b border-border">
            <div className="flex justify-between items-center w-full">
              <CardTitle className="px-2"> Epic Stack </CardTitle>
              {skylineState === "idle" ? (
                <Button
                  type="button"
                  className="shadow-smooth"
                  variant="outline"
                  onClick={() => setSkylineState("version")}
                >
                  Change version
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="shadow-smooth"
                  onClick={() => setSkylineState("idle")}
                >
                  Cancel
                </Button>
              )}
            </div>
            <div className="px-2">
              <FileStructureGrid
                width={getFileGridWidth({ paths })}
                paths={selectedCommit.files}
                ignore={selectedCommit.files.filter((path) => {
                  // if the path is ignored, grey out
                  if (
                    hideIgnored &&
                    ignorePatterns.some((pattern) => path.includes(pattern))
                  )
                    return true

                  // if the path is not in the project, grey out
                  if (hideNonMatching && !projectFilesSet.has(path)) return true

                  return false
                })}
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="px-2">
              {skylineState === "version" && (
                <>
                  <div className="relative z-10 mt-2">
                    <Slider
                      min={0}
                      max={commits.length - 1}
                      step={1}
                      value={[selectedCommitIndex]}
                      onValueChange={handleSliderChange}
                      className="w-full"
                    />
                    <div className="absolute w-full flex justify-between top-3 px-[9px] -z-10">
                      {commits.slice(0, 100).map((_, index) => (
                        <div
                          key={index}
                          className="border-l-2 h-2 border-neutral-300"
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-between text-sm text-muted-foreground mt-4">
                    <span>
                      {format(
                        new Date(commits[selectedCommitIndex].date),
                        "MMM d, yyyy",
                      )}
                      {" — "}
                      {commits[selectedCommitIndex].sha.slice(0, 7)}
                    </span>
                    <span>
                      {format(new Date(commits.at(-1).date), "MMM d, yyyy")}
                    </span>
                  </div>
                </>
              )}
              <p className="font-mono text-muted-foreground mt-2 flex items-center gap-x-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="-ml-2"
                  onClick={() => setShowSettings(!showSettings)}
                >
                  <Icon name="settings" className="size-5" />
                </Button>
                <strong className="font-bold text-foreground">
                  {includedPaths.length}
                </strong>{" "}
                {hideNonMatching ? "matching files" : "files"}
                {hideIgnored && (
                  <>
                    {","}
                    <strong className="font-bold text-foreground">
                      {ignoredPaths.length}
                    </strong>{" "}
                    ignored
                  </>
                )}{" "}
                in {cwd}
              </p>
              {showSettings && (
                <div className="mt-2 font-mono space-y-3 border-l border-border pl-6 ml-2">
                  <Label className="flex items-center gap-x-2">
                    <Checkbox
                      className="shadow-smooth"
                      checked={hideNonMatching}
                      onCheckedChange={() =>
                        setHideNonMatching(!hideNonMatching)
                      }
                    />
                    Hide {numberOfMatchingFiles} non-matching files
                  </Label>
                  <Label className="flex items-center gap-x-2">
                    <Checkbox
                      className="shadow-smooth"
                      checked={hideIgnored}
                      onCheckedChange={() => setHideIgnored(!hideIgnored)}
                    />
                    Hide {ignoredPaths.length} ignored files
                  </Label>
                </div>
              )}
            </div>
            {updatesAvailable > 0 && (
              <div className="mt-2">
                {Array.from({ length: 7 }).map((_, index) => {
                  const commit = commits[selectedCommitIndex - 3 + index]
                  if (!commit) return null
                  if (skylineState === "version" && index === 0) return null

                  const modifiedFiles = commit.affectedFiles.filter(
                    (file) => file.status === "modified",
                  )
                  const addedFiles = commit.affectedFiles.filter(
                    (file) => file.status === "added",
                  )
                  const deletedFiles = commit.affectedFiles.filter(
                    (file) => file.status === "deleted",
                  )

                  const Component = skylineState === "idle" ? "div" : "button"
                  return (
                    <Component
                      key={index}
                      className={cn(
                        "text-left block w-full font-mono relative group hover:bg-neutral-100 p-2 rounded",
                        index === 3 && "font-bold bg-neutral-100",
                      )}
                      onClick={() => {
                        if (skylineState === "version") {
                          setSelectedCommitIndex(
                            selectedCommitIndex - 3 + index,
                          )
                        }
                      }}
                    >
                      <div
                        className={cn(
                          "truncate whitespace-nowrap",
                          !commit.hasMatchingFiles && "opacity-30",
                        )}
                      >
                        <p>{commit.message}</p>
                        <p className="text-sm text-muted-foreground">
                          {commit.time_ago}
                          {modifiedFiles.length > 0 && (
                            <span className="text-cyan-600 font-bold">
                              {" "}
                              {modifiedFiles.length}M
                            </span>
                          )}
                          {addedFiles.length > 0 && (
                            <span className="text-green-600 font-bold">
                              {" "}
                              {addedFiles.length}A
                            </span>
                          )}
                          {deletedFiles.length > 0 && (
                            <span className="text-red-600 font-bold">
                              {" "}
                              {deletedFiles.length}D
                            </span>
                          )}
                          {!commit.hasMatchingFiles && (
                            <span className="font-bold"> Hidden </span>
                          )}
                        </p>
                      </div>

                      {skylineState === "idle" && (
                        <div
                          className={cn(
                            "hidden group-hover:flex absolute right-2 -top-4 border border-border rounded-md  items-center bg-white shadow-smooth",
                            index === 3 && "flex",
                          )}
                        >
                          <Button
                            variant="ghost"
                            asChild
                            size="icon"
                            className="text-sm text-muted-foreground"
                          >
                            <Link
                              to={`https://github.com/${repo.owner.login}/${repo.name}/commit/${commit.sha}`}
                            >
                              <Icon name="github" className="size-4" />
                            </Link>
                          </Button>
                          {index === 3 && skylineState === "idle" && (
                            <Button
                              variant="ghost"
                              asChild
                              size="sm"
                              className="text-sm text-muted-foreground"
                            >
                              <Link
                                to={`/github/${repo.owner.login}/${repo.name}/commit/${nextCommit.sha}`}
                              >
                                Start updating
                              </Link>
                            </Button>
                          )}
                        </div>
                      )}
                    </Component>
                  )
                })}
                {commits.length - selectedCommitIndex > 3 && (
                  <p className=" px-2 font-mono text-sm text-muted-foreground">
                    {" "}
                    and{" "}
                    {
                      commits
                        .slice(selectedCommitIndex + 1)
                        .filter((commit) => commit.hasMatchingFiles).length
                    }{" "}
                    more…
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  )
}
