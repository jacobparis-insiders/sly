import type { TestContext, TaskContext } from "vitest"
import { prepareEnvironment } from "@gmrchk/cli-testing-library"
import chalk from "chalk"
import { rmSync, existsSync } from "fs"
export async function spawnSly(
  test: TaskContext & TestContext,
  command: string
) {
  test.onTestFailed((result) => {
    result.errors?.forEach((error) => {
      flushOutput(error.message)
      error.message = getOutput()
    })
  })

  const env = await prepareEnvironment()

  let previousStdout = [""]
  let previousStderr = [""]

  const [runner, ...args] = command.split(" ")
  if (!runner) throw new Error(`No runner specified`)

  const lib = await env.spawn(runner, args.join(" "))

  const output = ["", chalk.magentaBright(`> ${command}`)]

  function wait(delay: number) {
    flushOutput(`⏰ ${chalk.cyan(`wait(${chalk.white(delay)})`)}`)
    return lib.wait(delay)
  }

  function waitForText(text: string) {
    flushOutput(`⏰ ${chalk.cyan(`waitForText(${chalk.green(`"${text}"`)})`)}`)
    // Sometimes the CLI is too fast and the text we're waiting for has already printed
    // Check to see if the text printed since our last assertion (so we know it's in order)
    let previousWaitForText
    let previousWaitForTextIndex
    for (let i = output.length - 2; i >= 0; i--) {
      // maybe check all assertions here and not just these? 🤔
      // that would make it easier to reuse this logic
      if (output[i].includes(`waitForText`)) {
        // '⏰ \x1B[36mwaitForText(\x1B[32m"Installing camera.svg"\x1B[39m\x1B[36m)\x1B[39m'
        previousWaitForText = output[i].match(/"(.*)"/)?.[1]
        previousWaitForTextIndex = i
        break
      }
    }

    if (previousWaitForTextIndex !== undefined) {
      const previousWaitForTextOutput = output.slice(previousWaitForTextIndex)

      for (const line of previousWaitForTextOutput) {
        if (line.includes(text)) {
          return {
            line,
            type: "stdout",
          }
        }
      }
    }

    return lib.waitForText(text)
  }

  function waitForFinish() {
    flushOutput(`⏰ ${chalk.cyan(`waitForFinish()`)}`)
    return lib.waitForFinish()
  }

  async function readFile(path: string) {
    flushOutput(`🔍 ${chalk.yellow(`readFile(${chalk.green(`"${path}"`)})`)}`)

    if (!existsSync(path)) {
      // Try again in half a second
      await new Promise((resolve) => setTimeout(resolve, 500))

      if (!existsSync(path)) {
        const error = new Error(`File "${path}" does not exist`)
        // Throw the error from the test file, not this file
        error.stack = error.stack?.split("\n").slice(2).join("\n")
        throw error
      }
    }
  }

  async function listFiles(path?: string) {
    flushOutput(`🔍 ${chalk.yellow(`listFiles(${chalk.green(`"${path}"`)})`)}`)

    const files = await env.ls(path)
    output.push(...files)

    return files
  }

  async function writeText(text: string) {
    flushOutput(
      `⌨️  ${chalk.magenta(`writeText(${chalk.green(`"${text}"`)})`)}`
    )
    return lib.writeText(text)
  }

  function pressKey(
    key:
      | "arrowDown"
      | "arrowLeft"
      | "arrowRight"
      | "arrowUp"
      | "backSpace"
      | "delete"
      | "end"
      | "enter"
      | "escape"
      | "home"
      | "pageUp"
      | "pageDown"
      | "space"
  ) {
    flushOutput(`⌨️  ${chalk.magenta(`pressKey(${chalk.green(`"${key}"`)})`)}`)

    return lib.pressKey(key)
  }

  function getStdout() {
    return lib.getStdout()
  }

  function getStderr() {
    return lib.getStderr()
  }

  function getOutput() {
    return output.join("\n")
  }

  function throwOutput() {
    flushOutput(`🚨 ${chalk.bold.red(`throwOutput()`)}`)
    throw getOutput()
  }

  function getExitCode() {
    return lib.getExitCode()
  }

  function kill(signal: NodeJS.Signals) {
    return lib.kill(signal)
  }

  function debug() {
    return lib.debug()
  }

  function cleanup() {
    rmSync(`./tests/temp/${test.task.id}`, { recursive: true, force: true })
    return env.cleanup()
  }

  return {
    wait,
    waitForText,
    waitForFinish,
    writeText,
    pressKey,
    getStdout,
    getStderr,
    getOutput,
    throwOutput,
    readFile,
    listFiles,
    getExitCode,
    flushOutput,
    kill,
    debug,
    cleanup,
  }

  function flushOutput(assertion?: string) {
    const stderr = lib.getStderr().slice(previousStderr.length)
    output.push(...stderr)

    const stdout = lib.getStdout().slice(previousStdout.length)
    output.push(...stdout)

    if (assertion) {
      output.push(assertion)
    }

    previousStdout = lib.getStdout()
    previousStderr = lib.getStderr()
  }
}
