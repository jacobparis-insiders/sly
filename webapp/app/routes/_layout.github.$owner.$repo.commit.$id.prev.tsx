import { type LoaderFunctionArgs, redirect } from "@remix-run/node"
import { Octokit } from "@octokit/rest"
import { invariant } from "@epic-web/invariant"
import { cachified } from "#app/cache.server.js"
import { getUser } from "#app/auth.server.js"

export const handle = {
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

  // Use the same cache key as the index route
  const { data: commits } = await cachified({
    key: `commits-${owner}-${repo}`,
    getFreshValue: () =>
      octokit.repos.listCommits({ owner, repo, per_page: 100 }),
    ttl: 1000 * 60 * 15, // 15 minutes
  })

  // Find the index of the current commit
  const currentIndex = commits.findIndex((commit) => commit.sha === id)

  // If we found the commit and it's not the first one
  if (currentIndex > 0) {
    throw redirect(
      `/github/${owner}/${repo}/commit/${commits[currentIndex - 1].sha}`,
    )
  }

  // If it's the first commit or not found, redirect back
  throw redirect(`/github/${owner}/${repo}/commit/${id}`)
}
