// http://localhost:3000/registry/@sly-cli/transformers.json
// https://sly-cli.fly.dev/registry/@sly-cli/transformers.json

import { json, type LoaderArgs } from "@remix-run/node"
import type { z } from "zod"
import type {
  libraryIndexSchema,
  libraryItemWithContentSchema,
} from "~/schemas"

export const meta = {
  name: "@sly-cli/transformers",
  source: "https://github.com/jacobparis-insiders/sly",
  description: "Transformer snippets to use with sly.",
  license: "https://github.com/jacobparis-insiders/sly",
} as const

export const transformers = [
  {
    name: "html-meta-comments",
    dependencies: [],
    devDependencies: [],
    registryDependencies: [],
    files: [
      {
        name: "html-meta-comments.js",
        content: `
/**
 * Prepends the file with HTML comments containing author and license info
 *
 * @type {import('@sly-cli/sly').Transformer}
 */
export default function htmlMetaComments(input, meta) {
  return [
    \`<!-- Downloaded from $\{meta.name} -->\`,
    \`<!-- License $\{meta.license} -->\`,
    \`<!-- $\{meta.source} -->\`,
    input,
  ].join("\\n")
}
        `.trim(),
      },
    ],
  },
  {
    name: "html-prettier",
    dependencies: [],
    devDependencies: ["prettier"],

    registryDependencies: [],
    files: [
      {
        name: "html-prettier.js",
        content: `
import prettier from "prettier"

/**
 * Prettifies the input HTML
 *
 * @type {import('@sly-cli/sly').Transformer}
 */
export default function htmlPrettify(input) {
  return prettier.format(input, {
    parser: "html",
  })
}`.trim(),
      },
    ],
  },
  {
    name: "js-meta-comments",
    dependencies: [],
    devDependencies: [],
    registryDependencies: [],
    files: [
      {
        name: "js-meta-comments.js",
        content: `
/**
 * Prepends the file with JSDoc containing author and license info
 *
 * @type {import('@sly-cli/sly').Transformer}
 */
export default function jsMetaComments(input, meta) {
  return [
    \`/**\`,
    \` * Downloaded from $\{meta.name}\`,
    \` * @license $\{meta.license} -->\`,
    \` * @see $\{meta.source}\`,
    \`*/\`,
    input,
  ].join("\\n")
}`.trim(),
      },
    ],
  },
  {
    name: "svg-remove-dimensions",
    dependencies: [],
    devDependencies: ["node-html-parser"],
    registryDependencies: [],
    files: [
      {
        name: "svg-remove-dimensions.js",
        content: `
import { parse } from "node-html-parser"

/**
 * Removes the width and height attributes from the SVG element
 *
 * @type {import('@sly-cli/sly').Transformer}
 */
export default async function svgRemoveDimensions(input) {
  const root = parse(input)
  const svg = root.querySelector("svg")
  if (!svg) throw new Error("No SVG element found")

  svg.removeAttribute("width")
  svg.removeAttribute("height")

  return root.toString()
}
        `.trim(),
      },
    ],
  },
  {
    name: "ts-prettier",
    dependencies: [],
    devDependencies: ["prettier"],
    registryDependencies: [],
    files: [
      {
        name: "ts-prettier.js",
        content: `
import prettier from "prettier"

/**
 * Prettifies the input typescript
 *
 * @type {import('@sly-cli/sly').Transformer}
 */
export default function tsPrettify(input) {
  return prettier.format(input, {
    parser: "typescript",
  })
}`.trim(),
      },
    ],
  },
  {
    name: "js-remove-use-client",
    dependencies: [],
    devDependencies: [],
    registryDependencies: [],
    files: [
      {
        name: "js-remove-use-client.js",
        content: `
/**
 * Removes the "use client" line
 *
 * @type {import('@sly-cli/sly').Transformer}
 */
export default function removeUseClient(input) {
  return input.replace(/"use client".*/g, "\\n")
}
        `.trim(),
      },
    ],
  },
] satisfies Omit<z.infer<typeof libraryItemWithContentSchema>, "meta">[]

export async function loader({ request }: LoaderArgs) {
  return json<z.infer<typeof libraryIndexSchema>>({
    version: "1.1.0",
    meta,
    resources: transformers.map((transformer) => ({
      name: transformer.name,
      dependencies: transformer.dependencies,
      devDependencies: transformer.devDependencies,
      registryDependencies: transformer.registryDependencies,
    })),
  })
}
