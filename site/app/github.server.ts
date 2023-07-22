import { Octokit } from "octokit"
import cachified from "cachified"
import { cache } from "./cache.server.js"

declare global {
  var __octokit: Octokit
}

if (!globalThis.__octokit) {
  globalThis.__octokit = new Octokit()
}

export const octokit = globalThis.__octokit

export async function getGithubDirectory<Path extends string>({
  owner,
  repo,
  path,
  ref = "main",
}: {
  owner: string
  repo: string
  path: Path
  ref?: string
}) {
  return cachified({
    cache,
    key: `github/${owner}/${repo}/${path}`,
    staleWhileRevalidate: 1000 * 60 * 60, // 1 hour
    ttl: 1000 * 60 * 60, // 1 hour
    async getFreshValue() {
      console.log(`Cache miss for github directory ${owner}/${repo}/${path}`)
      // get latest commit for directory path
      const latestCommit = await octokit.rest.repos.getCommit({
        owner,
        repo,
        path: "icons",
        ref,
      })

      const tree = await octokit.rest.git.getTree({
        owner,
        repo,
        tree_sha: latestCommit.data.sha,
        recursive: "true",
      })

      // flatmap instead of filter so we can type the results
      const files = tree.data.tree.flatMap((file) => {
        if (file.type !== "blob") return []
        if (!file.path) return []
        if (!file.path.startsWith(`${path}/`)) return []

        return [
          {
            ...file,
            type: "blob" as const,
            path: file.path as `${Path}/${string}`,
          },
        ]
      })

      return files
    },
  })
}

export async function getGithubFile<Path extends string>({
  owner,
  repo,
  path,
  ref = "main",
}: {
  owner: string
  repo: string
  path: Path
  ref?: string
}) {
  return cachified({
    cache,
    key: `github/${owner}/${repo}/${path}`,
    staleWhileRevalidate: 1000 * 60 * 60, // 1 hour
    ttl: 1000 * 60 * 60, // 1 hour
    async getFreshValue() {
      console.log(`Cache miss for github file ${owner}/${repo}/${path}`)

      // for single files we don't need to get the commit, just the file
      const file = await octokit.rest.repos.getContent({
        owner,
        repo,
        path,
        ref,
      })

      if (Array.isArray(file.data)) {
        throw new Error("Expected a single file, got an array")
      }

      return file.data
    },
  })
}
