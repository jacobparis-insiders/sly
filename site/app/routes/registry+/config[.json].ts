// http://localhost:3000/registry/config.json
// https://sly-cli.fly.dev/registry/config.json

import { json, type LoaderArgs } from "@remix-run/node"

// This is the JSON schema for the config file
export async function loader({ request }: LoaderArgs) {
  return json({
    $schema: "http://json-schema.org/draft-07/schema#",
    type: "object",
    required: ["libraries"],
    properties: {
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
