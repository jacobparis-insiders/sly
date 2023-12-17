#!/usr/bin/env node
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"
import { existsSync } from "node:fs"
import { spawn } from "node:child_process"

// Get the absolute path of the script
const __filename = fileURLToPath(import.meta.url)
// Get the directory name of the script
const __dirname = dirname(__filename)
// Clone the current process environment
const env = { ...process.env }

// We can only use the ts-loader if the user has installed Sly.
// If they run from npx without installing, don't set the flag.
if (existsSync(join(process.cwd(), "node_modules", "@sly-cli", "sly"))) {
  env.NODE_OPTIONS = "--experimental-loader @sly-cli/sly/ts-loader"
}

// Get arguments passed to the script
const args = process.argv.slice(2)

// Execute the real Sly CLI with the provided arguments
const child = spawn("node", [join(__dirname, "dist", "index.js"), ...args], {
  stdio: "inherit",
  shell: true,
  env,
})

child.on("error", (err) => {
  console.error(`Failed to start subprocess: ${err.message}`)
})
