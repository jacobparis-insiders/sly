import { register } from "node:module"
import { pathToFileURL } from "node:url"

register("@sly-cli/sly/ts-loader", pathToFileURL("./"))
