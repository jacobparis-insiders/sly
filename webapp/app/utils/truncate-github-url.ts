// const testUrls = [
//   'https://github.com/remix-run/remix/blob/main/packages/remix-dev/config/defaults/entry.client.tsx',
//   'https://github.com/vercel/next.js',
//   'github.com/facebook/react/tree/main/packages/react',
//   'microsoft/TypeScript/blob/main/src/compiler/types.ts',
//   'remix-run/remix/blob/main/packages/remix-dev/config/defaults/entry.server.node.tsx',
//   'vercel/next.js/blob/canary/packages/next/src/client/components/layout-router.tsx',
// ];

export function truncateGitHubUrl(url: string, printWidth: number = 60) {
  // Remove protocol
  url = url.replace(/^https?:\/\//, "")

  // Split the URL into segments and remove github.com if present
  const segments = url.split("/")
  if (segments[0] === "github.com") {
    segments.shift()
  }

  // If we don't have enough segments, return the original (minus github.com)
  if (segments.length <= 2) {
    return segments.join("/")
  }

  // Always keep the final segment
  const finalSegment = segments[segments.length - 1]

  // Calculate space needed for final segment
  let remainingWidth = printWidth - finalSegment.length

  // Start building from the beginning
  const result = []
  let currentLength = 0

  // Try to fit as many starting segments as possible
  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i]
    const newLength =
      currentLength + segment.length + (result.length > 0 ? 1 : 0)

    if (newLength + 4 <= remainingWidth) {
      // +4 accounts for possible ".../""
      result.push(segment)
      currentLength = newLength
    } else {
      break
    }
  }

  // Construct final string
  let truncated = result.join("/")

  // Only add ellipsis if we actually omitted segments
  if (result.length < segments.length - 1) {
    truncated += (truncated ? "/..." : "...") + "/" + finalSegment
  } else {
    truncated += "/" + finalSegment
  }

  return truncated
}
