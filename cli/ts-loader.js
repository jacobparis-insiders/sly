"use strict"
import * as esbuild from "esbuild"
import { readFile } from "fs/promises"
import { fileURLToPath } from "node:url"

const extensions = ["ts"]
const getExtension = (url) => url.split(".").pop()

export async function load(url, context, defaultLoad) {
  if (extensions.includes(getExtension(url))) {
    const result = await esbuild.transform(
      await readFile(fileURLToPath(url), "utf8"),
      { loader: getExtension(url) }
    )

    return {
      source: result.code,
      format: "module",
      shortCircuit: true,
    }
  }
  return defaultLoad(url, context, defaultLoad)
}
