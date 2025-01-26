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
import { useState } from "react"
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

      commit.affectedFiles = commitDetails.files?.map((file) => {
        return {
          path: file.filename,
          status: file.status,
        }
      })
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
  const commits = repo.all_commits
    .map((a) => a)
    .filter((a) => !a.message?.includes("skip ci"))
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

  const selectedCommit = commits[selectedCommitIndex]

  console.log(selectedCommit)

  // Find the next commit after the current version
  const nextVersionIndex =
    currentVersionIndex === -1 ? 0 : currentVersionIndex - 1
  const nextCommit = commits[nextVersionIndex]

  // Filter paths based on ignore settings from config
  const ignorePatterns = config?.ignore || []
  const ignoredPaths = selectedCommit.files.filter((path) =>
    ignorePatterns.some((pattern) => path.includes(pattern)),
  )
  const includedPaths = selectedCommit.files.filter(
    (path) => !ignorePatterns.some((pattern) => path.includes(pattern)),
  )

  console.log({ projectFiles })
  const matchingFilesInProject = includedPaths.filter((path) =>
    projectFiles.files?.some((file) => `/${path}` === file),
  )

  // Calculate matching files
  const matchingFiles = matchingFilesInProject.length

  console.log({ ignoredPaths, ignorePatterns })

  const [skylineState, setSkylineState] = useState<"idle" | "version">("idle")
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

        <Card className="mt-6">
          <CardHeader className="flex-col">
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
                  if (ignorePatterns.some((pattern) => path.includes(pattern)))
                    return true

                  // if the path is not in the project, grey out
                  if (
                    !projectFiles.files.some((file) => file.slice(1) === path)
                  )
                    return true

                  return false
                })}
              />
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
              <p className="font-mono text-muted-foreground mt-2">
                <strong className="font-bold text-foreground">
                  {matchingFiles}
                </strong>{" "}
                matching,{" "}
                <strong className="font-bold text-foreground">
                  {ignoredPaths.length}
                </strong>{" "}
                ignored in {cwd}
              </p>
            </div>
          </CardHeader>
          <CardContent>
            {updatesAvailable > 0 && (
              <div className="mt-4">
                {Array.from({ length: 7 }).map((_, index) => {
                  const commit = commits[selectedCommitIndex - 3 + index]
                  if (!commit) return null
                  if (skylineState === "version" && index === 0) return null

                  return (
                    <div
                      key={index}
                      className={cn(
                        "font-mono relative group hover:bg-neutral-100 p-2 rounded",
                        index === 3 && "font-bold",
                        skylineState === "idle" &&
                          index === 3 &&
                          "bg-neutral-100",
                      )}
                    >
                      <div className="truncate whitespace-nowrap">
                        <p>{commit.message}</p>
                        <p className="text-sm text-muted-foreground">
                          {commit.time_ago}
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
                    </div>
                  )
                })}
                {commits.length - selectedCommitIndex > 3 && (
                  <p className=" px-2 font-mono text-sm text-muted-foreground">
                    {" "}
                    and {commits.length - selectedCommitIndex - 3} more…
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mt-6 opacity-0">
          <CardHeader className="flex-col">
            <div className=" w-full overflow-hidden">
              <div className="flex justify-between items-center w-full">
                <CardTitle>Epic Stack</CardTitle>
              </div>
              <FileStructureGrid
                width={getFileGridWidth({ paths })}
                paths={paths}
                ignore={projectFiles.files.map((file) => file.slice(1))}
              />
              <div className="flex justify-between items-center w-full">
                <CardTitle>App from epic stack</CardTitle>
              </div>
              <FileStructureGrid
                width={getFileGridWidth({ paths })}
                paths={projectFiles.files.map((file) => file.slice(1))}
                highlight={paths}
                // highlight={projectFiles.files.map((file) => file.slice(1))}
              />
            </div>
          </CardHeader>
          <CardContent></CardContent>
          <Button
            type="button"
            onClick={() => {
              config.template.version = selectedCommit.sha
              updateConfig({
                value: config,
              })
            }}
            className="mt-4"
          >
            Use this version
          </Button>
        </Card>
      </FadeIn>
    </div>
  )
}
