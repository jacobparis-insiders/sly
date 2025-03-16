import { describe, it, expect } from "vitest"
import slyJsonata from "./slyJsonToV2.jsonata.js"
import jsonata from "jsonata"

// TODO: get rid of eslint
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function convertSlyJsonToV2(jsonString: any) {
  const codemod = jsonata(slyJsonata.content)
  const result = codemod.evaluate(jsonString)
  return result
}

describe("slyJsonToV2 Conversion", () => {
  it("moves config for single icon lib", async () => {
    const inputJson = {
      $schema: "https://sly-cli.fly.dev/registry/config.json",
      libraries: [
        {
          name: "lucide-icons",
          directory: "./svg-icons",
          postinstall: [],
          transformers: [],
        },
      ],
    }

    const result = await convertSlyJsonToV2(inputJson)
    expect(result).toMatchInlineSnapshot(`
      {
        "$schema": "https://sly-cli.fly.dev/registry/config.v2.json",
        "config": {
          "components": {},
          "icons": {
            "directory": "./svg-icons",
            "postinstall": [],
            "transformers": [],
          },
          "utils": {},
        },
        "libraries": {
          "iconify:lucide": {
            "config": "icons",
            "name": "Lucide Icons",
          },
        },
      }
    `)
  })

  it("moves config for single component lib", async () => {
    const inputJson = {
      $schema: "https://sly-cli.fly.dev/registry/config.json",
      libraries: [
        {
          name: "@shadcn/ui",
          directory: "./components/ui",
          postinstall: [],
          transformers: [],
        },
      ],
    }

    const result = await convertSlyJsonToV2(inputJson)
    expect(result).toMatchInlineSnapshot(`
      {
        "$schema": "https://sly-cli.fly.dev/registry/config.v2.json",
        "config": {
          "components": {
            "directory": "./components/ui",
            "postinstall": [],
            "transformers": [],
          },
          "icons": {},
          "utils": {},
        },
        "libraries": {
          "@shadcn/ui": {
            "config": "components",
          },
        },
      }
    `)
  })

  it("moves config for single util lib", async () => {
    const inputJson = {
      $schema: "https://sly-cli.fly.dev/registry/config.json",
      libraries: [
        {
          name: "just",
          directory: "./utils",
          postinstall: [],
          transformers: [],
        },
      ],
    }

    const result = await convertSlyJsonToV2(inputJson)
    expect(result).toMatchInlineSnapshot(`
      {
        "$schema": "https://sly-cli.fly.dev/registry/config.v2.json",
        "config": {
          "components": {},
          "icons": {},
          "utils": {
            "directory": "./utils",
            "postinstall": [],
            "transformers": [],
          },
        },
        "libraries": {
          "just": {
            "config": "utils",
          },
        },
      }
    `)
  })

  it("moves same config for two icon libs", async () => {
    const inputJson = {
      $schema: "https://sly-cli.fly.dev/registry/config.json",
      libraries: [
        {
          name: "lucide-icons",
          directory: "./svg-icons",
          postinstall: [],
          transformers: [],
        },
        {
          name: "tailwindlabs/heroicons",
          directory: "./svg-icons",
          postinstall: [],
          transformers: [],
        },
      ],
    }

    const result = await convertSlyJsonToV2(inputJson)
    expect(result).toMatchInlineSnapshot(`
      {
        "$schema": "https://sly-cli.fly.dev/registry/config.v2.json",
        "config": {
          "components": {},
          "icons": {
            "directory": "./svg-icons",
            "postinstall": [],
            "transformers": [],
          },
          "utils": {},
        },
        "libraries": {
          "iconify:heroicons": {
            "config": "icons",
            "name": "Hero Icons",
          },
          "iconify:lucide": {
            "config": "icons",
            "name": "Lucide Icons",
          },
        },
      }
    `)
  })

  it("moves config for one icon lib but leaves different config alone", async () => {
    const inputJson = {
      $schema: "https://sly-cli.fly.dev/registry/config.json",
      libraries: [
        {
          name: "lucide-icons",
          directory: "./svg-icons",
          postinstall: [],
          transformers: [],
        },
        {
          name: "tailwindlabs/heroicons",
          directory: "./other/svg-icons",
          postinstall: [],
          transformers: [],
        },
      ],
    }

    const result = await convertSlyJsonToV2(inputJson)
    expect(result).toMatchInlineSnapshot(`
      {
        "$schema": "https://sly-cli.fly.dev/registry/config.v2.json",
        "config": {
          "components": {},
          "icons": {
            "directory": "./svg-icons",
            "postinstall": [],
            "transformers": [],
          },
          "utils": {},
        },
        "libraries": {
          "iconify:heroicons": {
            "config": {
              "directory": "./other/svg-icons",
              "postinstall": [],
              "transformers": [],
            },
            "name": "Hero Icons",
          },
          "iconify:lucide": {
            "config": "icons",
            "name": "Lucide Icons",
          },
        },
      }
    `)
  })

  it("moves config for icon and component libs", async () => {
    const inputJson = {
      $schema: "https://sly-cli.fly.dev/registry/config.json",
      libraries: [
        {
          name: "lucide-icons",
          directory: "./svg-icons",
          postinstall: [],
          transformers: [],
        },
        {
          name: "@shadcn/ui",
          directory: "./components/ui",
          postinstall: [],
          transformers: [],
        },
      ],
    }

    const result = await convertSlyJsonToV2(inputJson)
    expect(result).toMatchInlineSnapshot(`
      {
        "$schema": "https://sly-cli.fly.dev/registry/config.v2.json",
        "config": {
          "components": {
            "directory": "./components/ui",
            "postinstall": [],
            "transformers": [],
          },
          "icons": {
            "directory": "./svg-icons",
            "postinstall": [],
            "transformers": [],
          },
          "utils": {},
        },
        "libraries": {
          "@shadcn/ui": {
            "config": "components",
          },
          "iconify:lucide": {
            "config": "icons",
            "name": "Lucide Icons",
          },
        },
      }
    `)
  })

  it("leaves config for unknown lib alone", async () => {
    const inputJson = {
      $schema: "https://sly-cli.fly.dev/registry/config.json",
      libraries: [
        {
          name: "unknown",
          directory: "./unknown",
          postinstall: [],
          transformers: [],
        },
      ],
    }

    const result = await convertSlyJsonToV2(inputJson)
    expect(result).toMatchInlineSnapshot(`
      {
        "$schema": "https://sly-cli.fly.dev/registry/config.v2.json",
        "config": {
          "components": {},
          "icons": {},
          "utils": {},
        },
        "libraries": {
          "unknown": {
            "config": {
              "directory": "./unknown",
              "postinstall": [],
              "transformers": [],
            },
          },
        },
      }
    `)
  })
})
