#!/usr/bin/env node
import { fileURLToPath } from "node:url"
import { dirname, join, parse } from "node:path"
import { existsSync } from "node:fs"
import { spawn } from "node:child_process"

// Get the absolute path of the script
const __filename = fileURLToPath(import.meta.url)
// Get the directory name of the script
const __dirname = dirname(__filename)
// Clone the current process environment
const env = { ...process.env }

const args = process.argv.slice(2)

// If the user passes --cwd, use that instead of looking up the project root
const projectRoot = args.find((arg) => arg === "--cwd")
  ? args[args.indexOf("--cwd") + 1]
  : await getProjectRoot()

// We can only use the ts-loader if the user has installed Sly.
// If they run from npx without installing, don't set the flag.
// const slyPath = join(projectRoot, "node_modules", "@sly-cli", "sly")
// if (existsSync(slyPath)) {
//   env.NODE_OPTIONS = `--import "@sly-cli/sly/register"`
// }

const argsWithoutCwdAndValue = args.filter(
  (arg) => arg !== "--cwd" && arg !== projectRoot,
)

// Execute the real Sly CLI with the provided arguments
const child = spawn(
  process.execPath, // Use process.execPath instead of "node"
  [
    join(__dirname, "dist", "index.js"),
    "--cwd",
    projectRoot,
    ...argsWithoutCwdAndValue,
  ],
  {
    stdio: "inherit",
    shell: false,
    cwd: projectRoot,
    env,
  },
)

child.on("error", (err) => {
  console.error(`Failed to start subprocess: ${err.message}`)
})

child.on("exit", (code, signal) => {
  if (signal) {
    console.log(
      `Child process was terminated due to receipt of signal ${signal}`,
    )
    process.exit(1)
  } else {
    process.exit(code)
  }
})

async function getProjectRoot() {
  let dir = process.cwd()
  const root = parse(dir).root
  while (dir !== root) {
    if (existsSync(join(dir, "package.json"))) {
      return dir
    }
    dir = dirname(dir)
  }

  throw new Error(
    "No package.json found in any parent directory. To set the project root explicitly, use the flag `--cwd <path>`",
  )
}
