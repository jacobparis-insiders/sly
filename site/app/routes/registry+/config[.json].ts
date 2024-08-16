// http://localhost:3000/registry/config.json
// https://sly-cli.fly.dev/registry/config.json

import { json, type LoaderFunctionArgs } from "@remix-run/node"

// This is the JSON schema for the config file
export async function loader({ request }: LoaderFunctionArgs) {
  return json({
    $schema: "http://json-schema.org/draft-07/schema#",
    type: "object",
    required: ["libraries"],
    properties: {
      template: {
        type: "object",
        properties: {
          repository: {
            type: "string",
            description: "The repository to use as a template",
            format: "uri",
          },
          head: {
            type: "string",
            description:
              "The commit from which you forked the template or last updated from it.",
          },
        },
      },
      libraries: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: {
              type: "string",
            },
            directory: {
              type: "string",
            },
            postinstall: {
              type: "array",
              items: {
                type: "string",
              },
            },
            transformers: {
              type: "array",
              items: {
                type: "string",
              },
            },
          },
          required: ["name", "directory", "postinstall", "transformers"],
        },
      },
    },
  })
}
