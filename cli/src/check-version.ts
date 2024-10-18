import { compareVersions } from "compare-versions"
import packageJson from "../package.json"
import { logger } from "./logger.js"
import chalk from "chalk"
import { npmSchema } from "site/app/schemas.js"

export async function checkVersion() {
  return fetch("https://registry.npmjs.org/@sly-cli/sly")
    .then((response) => response.json())
    .then((response) => npmSchema.parseAsync(response))
    .then((npm) => {
      const version = npm["dist-tags"].latest
      const comparison = compareVersions(version, packageJson.version)
      if (comparison === 1) {
        logger.warn(`Update available ${packageJson.version} -> ${version}.`)
        logger.warn(
          `Run ${chalk.bold("npm i --save-dev @sly-cli/sly")} to update.`,
        )
      }
    })
}
