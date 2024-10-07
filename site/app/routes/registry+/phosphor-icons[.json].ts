// http://localhost:3000/registry/phosphor-icons.json
// https://sly-cli.fly.dev/registry/phosphor-icons.json

import { json, type LoaderFunctionArgs } from"react-router"
import type { z } from "zod"
import type { Meta, libraryIndexSchema } from "../../schemas.js"
import { getGithubDirectory, getGithubIndex } from "../../github.server.js"
export const meta = {
  name: "phosphor-icons",
  source: "https://phosphoricons.com/",
  description:
    "Phosphor is a flexible icon family for interfaces, diagrams, presentations.",
  license: "https://raw.githubusercontent.com/phosphor-icons/core/main/LICENSE",
  tags: ["icons"],
} as const satisfies Meta

export async function loader({ request }: LoaderFunctionArgs) {
  const variants = await getGithubIndex({
    owner: "phosphor-icons",
    repo: "core",
    path: "assets",
    ref: "main",
  })

  console.log(variants)

  const icons = await Promise.all(
    variants.map((variant) =>
      getGithubDirectory({
        owner: "phosphor-icons",
        repo: "core",
        path: variant,
        ref: "main",
      }).then((resources) =>
        resources
          .filter((file) => {
            if (!file.path?.endsWith(".svg")) return false

            return true
          })
          .map((file) => {
            if (!file.path) throw new Error("File path is undefined")

            return {
              name: file.path
                ?.replace(`${variant}/`, "")
                .toLowerCase()
                .replace(/\.svg$/, ""),
            }
          })
      )
    )
  )

  const resources = icons.flat().sort((a, b) => a.name.localeCompare(b.name))
  return json<z.input<typeof libraryIndexSchema>>({
    version: "1.0.0",
    meta,
    resources,
  })
}
