import * as z from "zod"
import { confirm } from "../prompts.js"
import { existsSync } from "fs"
import fs from "fs/promises"
import path from "path"

import type { Transformer } from "~/src/index.js"
import { libraryItemWithContentSchema } from "site/app/schemas.js"
import { installFile } from "../install.js"
import { readPackageUp } from "read-package-up"
import { addDependency, addDevDependency, detectPackageManager } from "nypm"
import { fromPromise } from "../utils/from-promise.js"

type Component = z.infer<typeof libraryItemWithContentSchema>

export async function installComponents({
  logger = console.info,
  ...input
}: {
  payload: Component[]
  transformers: Array<{ default: Transformer }>
  targetDir: string
  selectedComponents: string[]
  library: string
  logger?: (message: string) => void
}) {
  logger(`Adding ${input.payload.length} items to ${input.targetDir}`)

  const targetDir = input.targetDir || "."
  let dependencies = []
  let devDependencies = []
  const alreadyInstalled = []
  const installed = []

  for (const component of input.payload) {
    if (!existsSync(targetDir)) {
      await fs.mkdir(targetDir, { recursive: true })
    }

    const existingComponent = component.files.filter((file) =>
      existsSync(path.resolve(input.targetDir, file.path || file.name)),
    )

    if (existingComponent.length && !process.env.OVERWRITE) {
      if (input.selectedComponents?.includes(component.name)) {
        alreadyInstalled.push(component.name)
      }
      continue
    }

    installed.push(component.name)
    dependencies.push(...component.dependencies)
    devDependencies.push(...component.devDependencies)

    const transformedFiles = await Promise.all(
      component.files.map(async (file) => {
        if (file.type === "jsonata") return file

        return {
          ...file,
          content: await input.transformers.reduce(
            async (content, transformer) =>
              transformer.default(await content, component.meta),
            Promise.resolve(file.content),
          ),
        }
      }),
    )

    for (const file of transformedFiles) {
      await installFile(file, { targetDir })
      logger(`Installed ${file.path || file.name}`)
    }
  }

  if (dependencies.length || devDependencies.length) {
    const packageJsonExplorer = await readPackageUp()
    if (packageJsonExplorer) {
      // remove dependencies that are already installed
      if (packageJsonExplorer.packageJson.dependencies) {
        dependencies = dependencies.filter(
          (dep) => !packageJsonExplorer.packageJson.dependencies?.[dep],
        )
      }

      // remove devDependencies that are already installed
      if (packageJsonExplorer.packageJson.devDependencies) {
        devDependencies = devDependencies.filter(
          (dep) => !packageJsonExplorer.packageJson.devDependencies?.[dep],
        )
      }
    }

    let shouldInstall = false
    if (dependencies.length || devDependencies.length) {
      shouldInstall = await confirm(
        [
          `This depends on the following:`,
          dependencies.length ? "\nDependencies:" : "",
          ...dependencies.map((dep: string) => `- ${dep}`),
          devDependencies.length ? "\nDev Dependencies:" : "",
          ...devDependencies.map((dep: string) => `\n- ${dep}`),
          "\nInstall?",
        ]
          .filter(Boolean)
          .join("\n"),
      )
    }

    const packageManager = await detectPackageManager(process.env.CWD!)
    if (dependencies.length) {
      logger(
        `${shouldInstall ? "" : "skip: "}${packageManager?.name || "npm"} ${
          packageManager?.command || "install"
        } ${dependencies.join(" ")}`,
      )
      if (shouldInstall) {
        await addDependency(dependencies, {
          packageManager,
        })
      }
    }

    if (devDependencies.length) {
      logger(
        `${shouldInstall ? "" : "skip: "}${packageManager?.name || "npm"} ${
          packageManager?.command || "install"
        } --save-dev ${devDependencies.join(" ")}`,
      )
      if (shouldInstall) {
        await addDevDependency(devDependencies, {
          packageManager,
        })
      }
    }
  }

  if (alreadyInstalled.length) {
    logger(
      `Skipped installing ${alreadyInstalled.join(
        ", ",
      )}. Run the following command to overwrite.`,
    )
    logger(
      `> pkgless add ${input.library} ${alreadyInstalled.join(
        " ",
      )} --overwrite`,
    )
  }
}

export const installComponentsSrc = fromPromise(
  ({ input, self }: { input: Parameters<typeof installComponents>[0] }) => {
    return installComponents({
      ...input,
      logger: (message) => {
        console.log(message)
        self._parent?.send({ type: "log", message })
      },
    })
  },
)
