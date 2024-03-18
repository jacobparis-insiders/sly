// build-routes.js
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const routesDir = path.join(__dirname, "app", "libraries")
const outputFilePath = path.join(__dirname, "app", "libraries", "routes.js")

let routesMap = "export const routes = {\n"

fs.readdirSync(routesDir).forEach((file) => {
  const { name, ext } = path.parse(file)
  if (ext === ".ts") {
    const routePath = "/" + (name === "index" ? "" : name)
    routesMap += `  "${routePath}": () => import("../libraries/${file}"),\n`
  }
})

routesMap += "};\n"

fs.writeFileSync(outputFilePath, routesMap)
console.log("Route mappings have been generated.")
