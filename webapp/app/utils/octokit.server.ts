export async function fetchAllContributors({ octokit, owner, repo }) {
  let contributors = []
  let page = 1
  let hasMore = true

  while (hasMore) {
    const response = await octokit.repos.listContributors({
      owner,
      repo,
      per_page: 100,
      page,
    })
    contributors = contributors.concat(response.data)
    hasMore = response.data.length === 100
    page++
  }

  return contributors
}

export async function fetchAllCommits({ octokit, owner, repo }) {
  let commits = []
  let hasMore = true
  let lastCommitDate = null

  while (hasMore) {
    const response = await octokit.repos.listCommits({
      owner,
      repo,
      per_page: 100,
      until: lastCommitDate,
    })
    commits = commits.concat(response.data)
    hasMore = response.data.length === 100
    if (hasMore) {
      lastCommitDate = new Date(
        response.data[response.data.length - 1].commit.committer.date,
      ).toISOString()
    }
  }

  return commits
}
