import { logger } from "./logger.js"

export async function healthcheck() {
  const baseUrl = process.env.REGISTRY_URL || "https://sly-cli.fly.dev"

  if (
    baseUrl.endsWith("/") ||
    baseUrl.endsWith(".json") ||
    baseUrl.includes("registry")
  ) {
    logger.error(
      `The registry URL should just be the basename with no trailing slash, like\n\nREGISTRY_URL=http://localhost:3000`,
    )
    process.exit(1)
  }

  await fetch(`${baseUrl}/registry/index.json`, {
    method: "HEAD",
  }).catch((error) => {
    logger.error(
      `Could not connect to the registry at ${baseUrl}/registry/index.json`,
    )

    if (process.env.REGISTRY_URL === "https://sly-cli.fly.dev") {
      logger.info(
        `If your internet connection is working, Sly may be experiencing an outage.`,
      )
    } else {
      logger.info(
        "Check to see if the registry is running, or provide a custom URL by setting the REGISTRY_URL environment variable.",
      )
    }
    process.exit(1)
  })
}
