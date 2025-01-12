// const testUrls = [
//   'https://github.com/remix-run/remix/blob/main/packages/remix-dev/config/defaults/entry.client.tsx',
//   'https://github.com/vercel/next.js',
//   'github.com/facebook/react/tree/main/packages/react',
//   'microsoft/TypeScript/blob/main/src/compiler/types.ts',
//   'remix-run/remix/blob/main/packages/remix-dev/config/defaults/entry.server.node.tsx',
//   'vercel/next.js/blob/canary/packages/next/src/client/components/layout-router.tsx',
// ];

export function parseGitHubUrl(url: string) {
  // Remove protocol and github.com if present
  const cleanUrl = url.replace(/^https?:\/\/(github\.com\/)?/, "")

  // Split the URL into segments
  const segments = cleanUrl.split("/")

  // First two segments are owner and repo
  const [owner, repo] = segments

  if (!owner || !repo) {
    throw new Error("Invalid GitHub URL")
  }

  return {
    owner,
    repo: repo.split("#")[0].split("?")[0], // Remove any hash or query params
  }
}
