import { execSync } from "child_process"
import { test, describe, expect, afterAll } from "vitest"
import { writeFileSync, existsSync, rmSync } from "fs"
import { spawnSly } from "../../test/spawnSly.js"

const context = {
  versions: ["latest"],
  cli: () => `node ./start.js --cwd ${process.cwd()}`,
}

describe.each(context.versions)(`%s`, () => {
  test("throws when config passed but not found", async (test) => {
    const { waitForText, cleanup } = await spawnSly(
      test,
      `${context.cli()} add @radix-ui/icons eraser --config ./tests/temp/${
        test.task.id
      }`,
    )

    await waitForText("No config found")

    await cleanup()
  })

  test("can read custom json config", async (test) => {
    const directory = `./tests/temp/${test.task.id}`
    const slyJson = {
      libraries: [
        {
          name: "@radix-ui/icons",
          directory: `${directory}/svg-icons`,
        },
      ],
    }

    // Create a file to be overwritten
    execSync(`mkdir -p ${directory}`)
    // Write the JSON to sly.json using writeFileSync to preserve double quotes
    writeFileSync(`${directory}/sly.json`, JSON.stringify(slyJson, null, 2), {
      encoding: "utf8",
    })

    const { waitForText, waitForFinish, writeText, cleanup } = await spawnSly(
      test,
      `${context.cli()} add @radix-ui/icons eraser --config ${directory}`,
    )

    await waitForText("Ready to install 1")

    await writeText("y")

    await waitForFinish()

    expect(existsSync(`${directory}/svg-icons/eraser.svg`)).toBeTruthy()

    await cleanup()
  })
})

afterAll(async () => {
  rmSync(`./tests/temp`, { recursive: true, force: true })
})
