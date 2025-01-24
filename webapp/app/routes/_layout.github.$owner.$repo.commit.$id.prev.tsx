import { type LoaderFunctionArgs, redirect } from "@remix-run/node"
import { Octokit } from "@octokit/rest"
import { invariant } from "@epic-web/invariant"
import { cachified } from "#app/cache.server.js"
import { getUser } from "#app/auth.server.js"
import { fetchAllCommits } from "#app/utils/octokit.server.js"

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

  const commits = await cachified({
    key: `commits-${owner}-${repo}`,
    getFreshValue: () => fetchAllCommits({ octokit, owner, repo }),
    ttl: 1000 * 60 * 15, // 15 minutes
  })
  const currentIndex = commits.findIndex((commit) => commit.sha === id)

  // If we found the commit and it's not the last one
  if (currentIndex !== -1 && currentIndex < commits.length - 1) {
    return redirect(
      `/github/${owner}/${repo}/commit/${commits[currentIndex + 1].sha}`,
    )
  }

  return redirect(`/github/${owner}/${repo}/commit/${id}`)
}
