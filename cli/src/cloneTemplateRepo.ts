import fs from "node:fs"
import path from "node:path"
import chalk from "chalk"
import { trimCwd } from "./utils/trimCwd.js"
import { execa } from "execa"

/**
 * @returns true if there were new changes
 */
export async function cloneTemplateRepo({
  repository,
  head,
  directory,
}: {
  repository: string
  head: string
  directory: string
}): Promise<boolean> {
  if (
    !fs.existsSync(directory) ||
    !fs.existsSync(path.join(directory, ".git"))
  ) {
    console.log("Cloning latest template to", trimCwd(directory))
    fs.mkdirSync(directory, { recursive: true })
    await execa("git", ["clone", "--quiet", repository, directory], {
      cwd: path.dirname(directory),
    })

    return true
  }

  // TODO: What happens when they change the template? Can we detect that?
  // package.json seems unreliable because can't trust the package name
  // maybe we can run a git command to see if the origin matches
  const gitRepo = await execa("git", ["remote", "get-url", "origin"], {
    cwd: directory,
  })
  if (gitRepo.stdout !== repository) {
    console.log(
      chalk.red(`Expected repository ${repository} but got ${gitRepo}`)
    )
    fs.rmSync(directory, { recursive: true })

    console.log(`Overwriting with latest ${repository}`, trimCwd(directory))
    await execa("git", ["clone", "--quiet", repository, directory], {
      cwd: path.dirname(directory),
    })
  }

  // fetch latest git tree
  await execa("git", ["pull", "--quiet"], { cwd: directory })
  const currentHash = await execa("git", ["rev-parse", "HEAD"], {
    cwd: directory,
  })
  if (currentHash.stdout === head) {
    console.log(trimCwd(directory), "is up to date")
    return false
  }
  console.log("Updating", trimCwd(directory))
  await execa("git", ["fetch", "--quiet"], { cwd: directory })

  return true
}
