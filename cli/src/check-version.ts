import { compareVersions } from "compare-versions"
import { getRegistryIndex } from "./registry.js"
import packageJson from "../package.json"
import { logger } from "./logger.js"
import chalk from "chalk"

export function checkVersion() {
  return getRegistryIndex().then(({ version }) => {
    const comparison = compareVersions(version, packageJson.version)
    if (comparison === 1) {
      logger.warn(`Update available ${packageJson.version} -> ${version}.`)
      logger.warn(
        `Run ${chalk.bold("npm i --save-dev @sly-cli/sly")} to update.`,
      )
    }
  })
}
