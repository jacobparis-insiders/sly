import { type LoaderFunctionArgs } from "@remix-run/node"
import { useLoaderData, useParams, useNavigate } from "@remix-run/react"
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
import { cachified } from "#app/cache.server.js"
import { getUser } from "#app/auth.server.js"
import { FileStructureGrid } from "#app/utils/skyline/file-structure-grid.js"
import { Slider } from "#app/components/ui/slider.js"
import { format } from "date-fns"
import { useState } from "react"
import { PreDiffViewWithTokens } from "#app/components/pre-diff-view.js"
import { tokenize, diffTokens } from "@pkgless/diff"
import { useUpdateConfig } from "#app/use-connection.js"
import { getConnection } from "#app/use-connection.js"

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

    const [repoData, contributors, allCommits, recentActivity, contents] =
      await Promise.all([
        cachified({
          key: `repo-${owner}-${repo}`,
          getFreshValue: () => octokit.repos.get({ owner, repo }),
          ttl: 1000 * 60 * 60 * 24, // 1 day
        }),

        cachified({
          key: `contributors-${owner}-${repo}`,
          getFreshValue: () => octokit.repos.listContributors({ owner, repo }),
          ttl: 1000 * 60 * 60, // 1 hour
        }),

        cachified({
          key: `commits-${owner}-${repo}`,
          getFreshValue: () =>
            octokit.repos.listCommits({ owner, repo, per_page: 100 }),
          ttl: 1000 * 60 * 15, // 15 minutes
        }),

        cachified({
          key: `activity-${owner}-${repo}`,
          getFreshValue: () =>
            octokit.activity.listRepoEvents({ owner, repo, per_page: 5 }),
          ttl: 1000 * 60 * 5, // 5 minutes
        }),

        cachified({
          key: `contents-${owner}-${repo}`,
          getFreshValue: async () => {
            const allPaths: string[] = []
            async function getContents(path = "") {
              const response = await octokit.repos.getContent({
                owner,
                repo,
                path,
              })

              if (Array.isArray(response.data)) {
                for (const item of response.data) {
                  if (item.type === "file") {
                    allPaths.push(item.path)
                  } else if (item.type === "dir") {
                    await getContents(item.path)
                  }
                }
              }
            }
            await getContents()
            return allPaths
          },
          ttl: 1000 * 60 * 60, // 1 hour
        }),
      ])

    invariant(repoData.data, "No repository data found")

    return {
      repo: {
        ...repoData.data,
        contributors_count: contributors.data.length,
        all_commits: allCommits.data.map((commit) => ({
          sha: commit.sha,
          message: commit.commit.message,
          date: commit.commit.author.date,
          time_ago: new Date(commit.commit.author.date).toLocaleString(),
        })),
        recent_activity: recentActivity.data.map((event) => {
          let message = "No message"

          if (event.payload.issue) {
            message = event.payload.issue.title || "No message"
          } else if (event.payload.comment) {
            message = event.payload.comment.body || "No message"
          } else if (event.payload.pages) {
            message = event.payload.pages[0]?.title || "No message"
          }

          return {
            message,
            time_ago: new Date(event.created_at).toLocaleString(),
          }
        }),
      },
      paths: contents,
      config: config.value,
    }
  } finally {
    connection?.close()
  }
}

export default function RepoPage() {
  const { repo, paths, config } = useLoaderData<typeof loader>()
  console.log(config)
  const params = useParams()
  const navigate = useNavigate()
  const [selectedCommitIndex, setSelectedCommitIndex] = useState(0)
  const { updateConfig } = useUpdateConfig()

  if (!repo) return <div className="p-6">No repository found</div>

  const handleSliderChange = (value: number[]) => {
    setSelectedCommitIndex(value[0])
  }

  const selectedCommit = repo.all_commits[selectedCommitIndex]
  const latestCommit = repo.all_commits[0]

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
              <span className="font-bold text-foreground">
                {repo.contributors_count}
              </span>
              <span className=""> contributors </span>
              <span className="font-bold text-foreground">
                {repo.all_commits.length}
              </span>
              <span className=""> commits</span>
            </div>
          </CardContent>
        </Card>

        <Button
          variant="outline"
          className="shadow-smooth transition-colors mt-4"
          asChild
        >
          <a href={repo.html_url} target="_blank" rel="noopener noreferrer">
            <Icon name="github" className="-ml-2 size-4" />
            View on GitHub
          </a>
        </Button>

        <Card className="mt-6">
          <CardHeader className="flex-col">
            <Heading>Repository Timeline</Heading>
            <div className=" w-full overflow-hidden">
              <FileStructureGrid paths={paths} />
              <div className="relative z-10">
                <Slider
                  min={0}
                  max={repo.all_commits.length - 1}
                  step={1}
                  value={[selectedCommitIndex]}
                  onValueChange={handleSliderChange}
                  className="w-full"
                />
                <div className="absolute w-full flex justify-between top-3 px-[9px] -z-10">
                  {repo.all_commits.map((_, index) => (
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
                    new Date(repo.all_commits.at(-1).date),
                    "MMM d, yyyy",
                  )}
                </span>
                <span>
                  {format(new Date(repo.all_commits[0].date), "MMM d, yyyy")}
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="font-mono">
              <p className="text-sm text-muted-foreground mb-2">
                {selectedCommit.message}
              </p>
              <p className="text-xs text-muted-foreground">
                {selectedCommit.time_ago}
              </p>
            </div>
          </CardContent>
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
