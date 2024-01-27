import { execSync } from "child_process"
import { test, afterAll, describe, vi } from "vitest"
import { compareVersions } from "compare-versions"

import { rmSync } from "fs"
import { spawnSly } from "./spawnSly.js"

export function sharedTests(context: {
  versions: Array<string>
  cli: (version: string) => string
}) {
  describe.each(context.versions)(`%s`, (version) => {
    function isBelowVersion(minimum: string) {
      if (version === "latest") return false

      return compareVersions(version, minimum) < 0
    }

    test.skipIf(isBelowVersion("1.4.6"))(
      `add shows instructions`,
      async (test) => {
        const { waitForText } = await spawnSly(
          test,
          `${context.cli(version)} add`
        )

        await waitForText("Which libraries would you like to use?")
      }
    )

    test.skipIf(isBelowVersion("1.4.6"))(
      "adds icon from args without confirmation",
      async (test) => {
        const { waitForText } = await spawnSly(
          test,
          `${context.cli(
            version
          )} add @radix-ui/icons eraser --directory ./tests/temp/${
            test.task.id
          }/ --overwrite --yes`
        )

        await waitForText("Installing eraser.svg")
        await waitForText("Installed")
      }
    )

    test.skipIf(isBelowVersion("1.4.6"))(
      "adds multiple icons from args without confirmation",
      async (test) => {
        const { waitForText } = await spawnSly(
          test,
          `${context.cli(
            version
          )} add @radix-ui/icons camera card-stack --directory ./tests/temp/${
            test.task.id
          }/ --overwrite --yes`
        )

        await waitForText("Installing camera.svg")
        await waitForText("Installing card-stack.svg")
        await waitForText("Installed")
      }
    )

    test.skipIf(isBelowVersion("1.4.6"))("adds icon from arg", async (test) => {
      const { waitForText, waitForFinish, writeText, cleanup, readFile } =
        await spawnSly(
          test,
          `${context.cli(
            version
          )} add @radix-ui/icons eraser --directory ./tests/temp/${
            test.task.id
          }/ --overwrite`
        )

      await waitForText("Ready to install 1")

      await writeText("y")

      await waitForText("Installing eraser.svg")
      await waitForText("Installed")

      await readFile(`./tests/temp/${test.task.id}/eraser.svg`)
      await waitForFinish()

      await cleanup()
    })

    test.skipIf(isBelowVersion("1.4.6"))(
      "adds multiple icons",
      async (test) => {
        const { waitForText, waitForFinish, writeText, cleanup, readFile } =
          await spawnSly(
            test,
            `${context.cli(
              version
            )} add @radix-ui/icons camera card-stack --directory ./tests/temp/${
              test.task.id
            }/ --overwrite`
          )

        await waitForText("Ready to install 2")

        await writeText("y")

        await waitForText("Installing camera.svg")
        await waitForText("Installed")
        await waitForText("Installing card-stack.svg")
        await waitForText("Installed")

        await readFile(`./tests/temp/${test.task.id}/camera.svg`)
        await readFile(`./tests/temp/${test.task.id}/card-stack.svg`)

        await waitForFinish()

        // await cleanup()
      }
    )

    test.skipIf(isBelowVersion("1.4.6"))(
      "add fails without --overwrite when file exists",
      async (test) => {
        // Create a file to be overwritten
        execSync(`mkdir -p ./tests/temp/${test.task.id}/`)
        execSync(`touch ./tests/temp/${test.task.id}/eraser.svg`)

        const { waitForText, waitForFinish, writeText, cleanup } =
          await spawnSly(
            test,
            `${context.cli(
              version
            )} add @radix-ui/icons eraser --directory ./tests/temp/${
              test.task.id
            }/`
          )

        await waitForText("Ready to install 1")

        await writeText("y")

        await waitForText("Component eraser already exists")

        await waitForFinish()

        await cleanup()
      }
    )

    test.skipIf(isBelowVersion("1.4.6"))(
      "add succeeds without --overwrite when file doesn't exist",
      async (test) => {
        const { waitForText, waitForFinish, writeText, cleanup, readFile } =
          await spawnSly(
            test,
            `${context.cli(
              version
            )} add @radix-ui/icons eraser --directory ./tests/temp/${
              test.task.id
            }/`
          )

        await waitForText("Ready to install 1")

        await writeText("y")

        await waitForText("Installing eraser.svg")
        await waitForText("Installed")

        await readFile(`./tests/temp/${test.task.id}/eraser.svg`)

        await waitForFinish()

        await cleanup()
      }
    )

    test.skipIf(isBelowVersion("1.4.6"))(
      "add 1 icon from lib interactively",
      async (test) => {
        const {
          waitForText,
          waitForFinish,
          writeText,
          pressKey,
          cleanup,
          readFile,
        } = await spawnSly(
          test,
          `${context.cli(
            version
          )} add @radix-ui/icons --directory ./tests/temp/${test.task.id}/`
        )

        await waitForText("Which items would you like to add?")

        await writeText("eraser") // this is a search/filter
        await pressKey("space") // select eraser
        await pressKey("enter") // confirm selection

        await waitForText("Ready to install 1")
        await pressKey("enter")

        await waitForText("Installing eraser")
        await waitForText("Installed")

        await readFile(`./tests/temp/${test.task.id}/eraser.svg`)

        await waitForFinish()
        await cleanup()
      }
    )
  })

  afterAll(async () => {
    rmSync(`./tests/temp`, { recursive: true, force: true })
  })
}
