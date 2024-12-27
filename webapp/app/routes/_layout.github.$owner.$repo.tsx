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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#app/components/ui/card.js"
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
import { ChevronRight, ChevronDown, LucideSearch } from "lucide-react"
import { processCollapsibleDiff } from "#app/utils/process-collapsible-diff.js"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
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
  const { owner, repo } = params
  invariant(owner, "No owner found in params")
  invariant(repo, "No repo found in params")

  const user = await getUser(request)
  const octokit = new Octokit({
    auth: user?.tokens.access_token,
  })

  const repoData = await cachified({
    key: `repo-${owner}-${repo}`,
    getFreshValue: () => octokit.repos.get({ owner, repo }),
    ttl: 1000 * 60 * 60 * 24, // 1 day
  })

  const contributors = await octokit.repos.listContributors({
    owner,
    repo,
  })

  const commits = await octokit.repos.listCommits({
    owner,
    repo,
    per_page: 5,
  })

  const recentActivity = await octokit.activity.listRepoEvents({
    owner,
    repo,
    per_page: 5,
  })

  const readme = await octokit.repos.getReadme({
    owner,
    repo,
    mediaType: {
      format: "html",
    },
  })

  invariant(repoData.data, "No repository data found")

  return {
    breadcrumbLabel: repoData.data.full_name,
    repo: {
      ...repoData.data,
      contributors_count: contributors.data.length,
      commits_count: commits.data.length,
      commits: commits.data.map((commit) => ({
        message: commit.commit.message,
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
    readme: readme.data,
  }
}

export default function RepoPage() {
  const { repo, readme } = useLoaderData<typeof loader>()

  if (!repo) return <div className="p-6">No repository found</div>

  return (
    <div className="p-6">
      <FadeIn show className="max-w-3xl">
        <div className="flex justify-between items-center">
          <Heading>{repo.full_name}</Heading>
          <div className="flex space-x-2">
            <span>⭐ {repo.stargazers_count}</span>
            <span>{repo.license?.spdx_id || "No License"}</span>
          </div>
        </div>

        <div className="mt-4">
          <p>{repo.description}</p>
          <div className="flex space-x-4 mt-2">
            <span>{repo.contributors_count} contributors</span>
            <span>{repo.commits_count} commits</span>
          </div>
        </div>

        <div className="mt-6">
          <Heading>Recent Commits</Heading>
          <ul className="mt-2">
            {repo.commits.map((commit, index) => (
              <li key={index} className="mt-2">
                <Card>
                  <CardHeader className="flex flex-col">
                    <CardTitle>{commit.message}</CardTitle>
                    <CardDescription>{commit.time_ago}</CardDescription>
                  </CardHeader>
                </Card>
              </li>
            ))}
          </ul>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <Heading>README</Heading>
          </CardHeader>
          <CardContent>
            <div
              className="prose mt-2"
              dangerouslySetInnerHTML={{ __html: readme }}
            />
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
      </FadeIn>
    </div>
  )
}
