import { type LoaderFunctionArgs, redirect } from "@remix-run/node"
import { Octokit } from "@octokit/rest"
import { invariant } from "@epic-web/invariant"
import { getUser } from "#app/auth.server.js"
import { fetchCommits } from "#app/utils/octokit.server.ts"

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

  const commits = await fetchCommits({ octokit, owner, repo })

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
