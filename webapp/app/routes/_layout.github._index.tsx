import { type LoaderFunctionArgs } from "@remix-run/node"
import { Form, redirect, useLoaderData } from "@remix-run/react"
import { invariant } from "@epic-web/invariant"
import { BreadcrumbHandle } from "#app/components/ui/breadcrumbs.js"
import { Button } from "#app/components/ui/button.js"
import { Input } from "#app/components/ui/input.js"
import { Card, CardHeader } from "#app/components/ui/card.js"
import { CardContent } from "#app/components/ui/card.js"
import { Heading } from "#app/components/heading.js"
import { GitHubLoginButton } from "./auth.github"
import { getUser } from "#app/auth.server.js"
import { Octokit } from "@octokit/rest"
import { GithubItemCard } from "#app/components/cards/github-item-card.js"
import { Icon } from "#app/components/icon.js"

// TODO: maybe reuse this for commit and PR?
export async function loader({ request }: LoaderFunctionArgs) {
  const user = await getUser(request)

  if (user) {
    const octokit = new Octokit({
      auth: user.tokens.access_token,
    })

    try {
      const { data: repos } = await octokit.repos.listForUser({
        username: user.profile.displayName,
      })

      return { repos }
    } catch (error) {
      console.error("Error fetching repositories:", error)
      return { repos: [] }
    }
  }

  return { repos: [] }
}

export default function GitHubBrowser() {
  const { repos } = useLoaderData<typeof loader>()

  return (
    <div>
      <Heading className="mt-8">Browse your GitHub Repositories</Heading>
      <GitHubLoginButton className="mt-2 shadow-smooth" />

      <div className="mt-4 grid grid-cols-3 gap-4">
        {repos.map((repo) => (
          <GithubItemCard item={repo} />
        ))}
      </div>
    </div>
  )
}
