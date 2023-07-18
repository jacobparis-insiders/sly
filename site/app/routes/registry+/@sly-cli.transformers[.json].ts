// http://localhost:3000/registry/@sly-cli/transformers.json
// https://sly-cli.fly.dev/registry/@sly-cli/transformers.json

import { json, type LoaderArgs } from "@remix-run/node"

export const meta = {
  name: "@sly-cli/transformers",
  source: "https://github.com/jacobparis-insiders/sly",
  description: "Transformer snippets to use with sly.",
  license: "https://github.com/jacobparis-insiders/sly",
} as const

export const transformers = [
  {
    name: "html-meta-comments",
    url: "https://sly-cli.fly.dev/registry/@sly-cli/transformers/html-meta-comments.json",
    files: [
      {
        name: "html-meta-comments.js",
        content: `
/**
 * Prepends the file with HTML comments containing author and license info
 *
 * @type {import('@sly-cli/sly').Transformer}
 */
export default function (input, meta) {
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
    url: "https://sly-cli.fly.dev/registry/@sly-cli/transformers/html-prettier.json",
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
export default function (input) {
  return prettier.format(input, {
    parser: "html",
  })
}`.trim(),
      },
    ],
  },
  {
    name: "js-meta-comments",
    url: "https://sly-cli.fly.dev/registry/@sly-cli/transformers/js-meta-comments.json",
    files: [
      {
        name: "js-meta-comments.js",
        content: `
/**
 * Prepends the file with JSDoc containing author and license info
 *
 * @type {import('@sly-cli/sly').Transformer}
 */
export default function (input, meta) {
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
    url: "https://sly-cli.fly.dev/registry/@sly-cli/transformers/svg-remove-dimensions.json",
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
export default async function (input) {
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
    url: "https://sly-cli.fly.dev/registry/@sly-cli/transformers/ts-prettier.json",
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
export default function (input) {
  return prettier.format(input, {
    parser: "typescript",
  })
}`.trim(),
      },
    ],
  },
  {
    name: "js-remove-use-client",
    url: "https://sly-cli.fly.dev/registry/@sly-cli/transformers/js-remove-use-client.json",
    files: [
      {
        name: "js-remove-use-client.js",
        content: `
/**
 * Removes the "use client" line
 *
 * @type {import('@sly-cli/sly').Transformer}
 */
export default function (input) {
  return input.replace(/"use client".*/g, "\\n")
}
        `.trim(),
      },
    ],
  },
]

export async function loader({ request }: LoaderArgs) {
  return json({
    version: "1.0.0",
    meta,
    resources: transformers.map((transformer) => ({
      name: transformer.name,
      url: transformer.url,
    })),
  })
}
