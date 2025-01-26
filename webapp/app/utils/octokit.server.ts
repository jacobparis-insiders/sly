import { LRUCache } from "lru-cache"
import { Octokit } from "@octokit/rest"
import { cache, cachified, doubleCachified, lru } from "#app/cache.server.js"
import { CachifiedOptions } from "@epic-web/cachified"

type FetchOctokitOptions = {
  octokit: Octokit
  owner: string
  repo: string
}

export async function fetchRepositoryData({
  octokit,
  owner,
  repo,
}: FetchOctokitOptions) {
  return cachified({
    cache: lru,
    key: `repo-${owner}-${repo}`,
    async getFreshValue() {
      return await octokit.repos.get({ owner, repo })
    },
    ttl: 1000 * 60 * 60 * 24, // 1 day
  })
}

export async function fetchContributors({
  octokit,
  owner,
  repo,
}: FetchOctokitOptions) {
  return cachified({
    cache: lru,
    key: `contributors-${owner}-${repo}`,
    async getFreshValue() {
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
    },
    swr: Infinity,
    ttl: 1000 * 60 * 60 * 24, // 1 day
  })
}

export async function fetchCommits({
  octokit,
  owner,
  repo,
}: FetchOctokitOptions) {
  return cachified({
    cache: lru,
    key: `commits-${owner}-${repo}`,
    async getFreshValue() {
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
    },
    swr: Infinity,
    ttl: 1000 * 60 * 15, // 15 minutes
  })
}

export async function fetchRepositoryContents({
  octokit,
  owner,
  repo,
  branch,
}: FetchOctokitOptions & { branch: string }) {
  return cachified({
    cache: lru,
    key: `contents-${owner}-${repo}-${branch}`,
    async getFreshValue() {
      const {
        data: { tree },
      } = await octokit.git.getTree({
        owner,
        repo,
        tree_sha: branch,
        recursive: "1",
      })

      return tree
        .filter((item) => item.type === "blob")
        .map((item) => item.path)
    },
    ttl: 1000 * 60 * 60, // 1 hour
  })
}

export async function fetchCommitFiles({
  octokit,
  owner,
  repo,
  commitSha,
}: FetchOctokitOptions & { commitSha: string }) {
  return doubleCachified({
    key: `files-${owner}-${repo}-${commitSha}`,
    async getFreshValue() {
      const {
        data: { tree },
      } = await octokit.git.getTree({
        owner,
        repo,
        tree_sha: commitSha,
        recursive: "1",
      })

      return tree
        .filter((item) => item.type === "blob")
        .map((item) => item.path)
    },
  })
}

export async function fetchCommitDetails({
  octokit,
  owner,
  repo,
  commitSha,
}: FetchOctokitOptions & { commitSha: string }) {
  return cachified({
    cache: lru,
    key: `commit-${owner}-${repo}-${commitSha}`,
    async getFreshValue() {
      const { data } = await octokit.repos.getCommit({
        owner,
        repo,
        ref: commitSha,
      })

      return data
    },
  })
}

export async function fetchFileContent({
  octokit,
  owner,
  repo,
  path,
  ref,
}: FetchOctokitOptions & { path: string; ref: string }) {
  return doubleCachified({
    key: `github-${owner}-${repo}-${path}-${ref}`,
    async getFreshValue() {
      return await octokit.repos.getContent({
        owner,
        repo,
        path,
        ref,
      })
    },
  })
}

export async function fetchCommitsForPath({
  octokit,
  owner,
  repo,
  path,
  branch,
}: FetchOctokitOptions & { path: string; branch: string }) {
  return cachified({
    cache: lru,
    key: `github-commits-${owner}-${repo}-${path}-${branch}`,
    async getFreshValue() {
      return octokit.repos.listCommits({
        owner,
        repo,
        path,
        sha: branch,
        per_page: 100,
      })
    },
    ttl: 1000 * 60 * 60 * 24, // 1 day
  })
}

export async function fetchFileContentAtCommit({
  octokit,
  owner,
  repo,
  path,
  commitSha,
}: FetchOctokitOptions & { path: string; commitSha: string }) {
  return cachified({
    cache: lru,
    key: `github-${owner}-${repo}-${path}-${commitSha}`,
    async getFreshValue() {
      return cachified({
        cache,
        key: `github-${owner}-${repo}-${path}-${commitSha}`,
        async getFreshValue() {
          return await octokit.repos.getContent({
            owner,
            repo,
            path,
            ref: commitSha,
          })
        },
      })
    },
  })
}
