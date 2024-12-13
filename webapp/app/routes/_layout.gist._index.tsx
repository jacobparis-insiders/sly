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
  const url = new URL(request.url)
  const gistUrl = url.searchParams.get("url")

  if (gistUrl) {
    const gistId = gistUrl.split("/").pop()
    invariant(gistId, "No gist ID found in URL")

    throw redirect(`/gist/${gistId}`)
  }

  const user = await getUser(request)

  if (user) {
    const octokit = new Octokit({
      auth: user.tokens.access_token,
    })

    try {
      const { data: gists } = await octokit.gists.listForUser({
        username: user.profile.displayName,
      })

      return { gists }
    } catch (error) {
      console.error("Error fetching gists:", error)
      return { gists: [] }
    }
  }

  return { gists: [] }
}

export default function GistUrlForm() {
  const { gists } = useLoaderData<typeof loader>()
  console.log(gists)

  return (
    <div>
      <label htmlFor="url">
        <Heading className="flex items-center gap-2">
          <Icon name="github" className="w-5 h-5 -mx-1" />
          gist url
        </Heading>
      </label>

      <Card className="w-max">
        <CardHeader></CardHeader>
        <CardContent>
          <Form method="GET" className="mt-2">
            <Input
              type="url"
              name="url"
              id="url"
              required
              className="min-w-96"
            />
            <Button type="submit" variant="primary" className="mt-2">
              Load gist
            </Button>
          </Form>
        </CardContent>
      </Card>

      <Heading className="mt-8">browse your gists</Heading>
      <GitHubLoginButton className="mt-2 shadow-smooth" />

      <div className="mt-4 grid grid-cols-4 gap-4">
        {gists.map((gist) => (
          <GithubItemCard item={gist} />
        ))}
      </div>
    </div>
  )
}
