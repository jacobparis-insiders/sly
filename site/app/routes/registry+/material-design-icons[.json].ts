// http://localhost:3000/registry/material-design-icons.json
// https://sly-cli.fly.dev/registry/material-design-icons.json

import { json, type LoaderFunctionArgs } from "@remix-run/node"
import type { z } from "zod"
import { type libraryIndexSchema } from "../../schemas.js"
import { getGithubDirectory } from "../../github.server.js"

export const meta = {
  name: "material-design-icons",
  source: "https://github.com/marella/material-design-icons/tree/main/svg",
  description: "Material Design icons by Google",
  license:
    "https://github.com/google/material-design-icons/blob/master/LICENSE",
} as const

export async function loader({ request }: LoaderFunctionArgs) {
  const allFiles = await getGithubDirectory({
    owner: "marella",
    repo: "material-design-icons",
    path: "svg",
    ref: "main",
  })

  const allSvgFiles = allFiles.filter((file) => {
    if (!file.path) throw new Error("File path is undefined")
    return Boolean(file.path.endsWith(".svg"))
  })

  const filledResources = allSvgFiles
    .filter((file) => file.path.startsWith("svg/filled/"))
    .map((file) => {
      return {
        name: file.path
          .replace(/^svg\/filled\//, "")
          .replace(/\.svg$/, "-filled"),
      }
    })

  const outlinedResources = allSvgFiles
    .filter((file) => file.path.startsWith("svg/outlined/"))
    .map((file) => {
      return {
        name: file.path
          .replace(/^svg\/outlined\//, "")
          .replace(/\.svg$/, "-outlined"),
      }
    })

  const roundResources = allSvgFiles
    .filter((file) => file.path.startsWith("svg/round/"))
    .map((file) => {
      return {
        name: file.path
          .replace(/^svg\/round\//, "")
          .replace(/\.svg$/, "-round"),
      }
    })

  const sharpResources = allSvgFiles
    .filter((file) => file.path.startsWith("svg/sharp/"))
    .map((file) => {
      return {
        name: file.path
          .replace(/^svg\/sharp\//, "")
          .replace(/\.svg$/, "-sharp"),
      }
    })

  const twoToneResources = allSvgFiles
    .filter((file) => file.path.startsWith("svg/two-tone/"))
    .map((file) => {
      return {
        name: file.path
          .replace(/^svg\/two-tone\//, "")
          .replace(/\.svg$/, "-two-tone"),
      }
    })

  const resources = [
    ...filledResources,
    ...outlinedResources,
    ...roundResources,
    ...sharpResources,
    ...twoToneResources,
  ].sort((a, b) => a.name.localeCompare(b.name))

  return json<z.input<typeof libraryIndexSchema>>({
    version: "1.0.0",
    meta,
    resources,
  })
}
