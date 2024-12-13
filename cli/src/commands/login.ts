import { Command } from "commander"
import { PartySocket } from "partysocket"
import WS from "ws"
import { z } from "zod"
import {
  getConfig,
  getConfigFilepath,
  resolveLibraryConfig,
  setConfig,
} from "../get-config.js"
import crypto from "crypto"
import { addComponentsFromLibrary } from "./add-component.fsm.js"
import { ConfigResponseSchema, ConfigSchema } from "../../../lib/schemas.js"
import { dirname } from "path"
import fs from "fs/promises"
import path from "path"
import { addIconsFromLibrary } from "./add-icon.fsm.js"
import { installFile } from "../install.js"

const StatusSchema = z.object({
  type: z.literal("status"),
  apps: z.array(z.string()),
})

const RequestCliSchema = z.object({
  type: z.literal("request-cli"),
  messageId: z.string(),
})

const RequestConfigSchema = z.object({
  type: z.literal("request-config"),
  messageId: z.string(),
})

const UpdateConfigSchema = z.object({
  type: z.literal("update-config"),
  value: ConfigSchema,
  messageId: z.string(),
})

const RequestItemFilesSchema = z.object({
  type: z.literal("request-item-files"),
  libraryId: z.string(),
  items: z.array(z.string()),
  messageId: z.string(),
})

const AddIconsSchema = z.object({
  type: z.literal("add-icons"),
  libraryId: z.string(),
  items: z.array(z.string()),
  messageId: z.string(),
})

const AddComponentsSchema = z.object({
  type: z.literal("add-components"),
  libraryId: z.string(),
  items: z.array(z.string()),
  messageId: z.string(),
})

const InstallFilesSchema = z.object({
  type: z.literal("install-files"),
  files: z.array(
    z.object({
      type: z.literal("file"),
      path: z.string(),
      content: z.string(),
    }),
  ),
  messageId: z.string(),
})

const MessageSchema = z.discriminatedUnion("type", [
  StatusSchema,
  RequestCliSchema,
  RequestConfigSchema,
  UpdateConfigSchema,
  RequestItemFilesSchema,
  AddIconsSchema,
  AddComponentsSchema,
  InstallFilesSchema,
])

export const login = new Command()
  .name("login")
  .description(`Log in to Sly`)
  .hook("preAction", () => {
    // This runs before every command, so this is our global state
    process.env.YES = "true"
    process.env.OVERWRITE = "true"
  })
  .action(async () => {
    console.info("Waiting for session…")
    // generate random room id
    const room = Buffer.from(crypto.randomBytes(16)).toString("hex")
    console.log("Creating room…", { room })

    const partySocket = new PartySocket({
      host: "127.0.0.1:1999",
      room,
      party: "cli",
      query: {
        cli: "true",
        source: "cli/login",
      },
      WebSocket: WS,
    })

    const connectedApps: Set<string> = new Set()

    // print each incoming message from the server to console
    partySocket.addEventListener("message", async (event: { data: string }) => {
      if (!event.data) return
      // event.data could match either of these
      // {"type":"request-config"}
      // 0f82f4da-89d2-4c52-8cc1-5a8b77c6c6ec: {"type":"request-config"}

      // extract the JSON isomorphically
      const json = event.data.startsWith("{")
        ? JSON.parse(event.data)
        : JSON.parse(event.data.split(":").slice(1).join(":"))

      console.log("json", json)
      const availableTypes = MessageSchema.options.map(
        (option) => option.shape.type.value,
      )

      if (!availableTypes.includes(json.type)) {
        return
      }

      const payload = MessageSchema.parse(json)
      // only print the success message once
      if (payload.type === "status") {
        // only print the success message once
        if (connectedApps.size === 0) {
          console.info("Connected to pkgless")
          console.info(`http://localhost:5173/?connectionId=${room}`)
        }

        if (payload.apps.length > 0) {
          connectedApps.clear()
          payload.apps.forEach((appId: string) => connectedApps.add(appId))
        }
      }

      // Send back the current working directory
      // and whether we have a config
      // maybe merge this with the request-config response
      if (payload.type === "request-cli") {
        const cwd = process.cwd()

        partySocket.send(
          JSON.stringify({
            type: "cli-response",
            messageId: payload.messageId,
            cwd,
            config: !!(await getConfigFilepath()),
          }),
        )
      }

      if (payload.type === "request-config") {
        const filepath = await getConfigFilepath()
        const config = await getConfig()

        const configResponse = ConfigResponseSchema.parse({
          type: "config-response",
          messageId: payload.messageId,
          filepath: filepath?.replace(dirname(process.cwd()), "") || null,
          value: config,
        })

        partySocket.send(JSON.stringify(configResponse))
      }

      if (payload.type === "update-config") {
        console.info("Updating config", payload.value)
        await setConfig(() => payload.value)

        partySocket.send(
          JSON.stringify({
            type: "update-config-response",
            messageId: payload.messageId,
          }),
        )
      }

      if (payload.type === "add-components") {
        console.info("Adding", payload.items.join(", "))
        try {
          await addComponentsFromLibrary({
            library: payload.libraryId,
            items: payload.items,
            logger: (message: string) => {
              console.info(message)
              partySocket.send(
                JSON.stringify({
                  type: "add-components-log",
                  message,
                  messageId: payload.messageId,
                }),
              )
            },
          })
        } catch (error) {
          console.error(error)
        }
      }

      if (payload.type === "add-icons") {
        console.info("Adding icons", payload.items.join(", "))
        await addIconsFromLibrary({
          library: payload.libraryId,
          items: payload.items,
          logger: (message: string) => {
            console.info(message)
            partySocket.send(
              JSON.stringify({
                type: "add-icons-response-log",
                message,
                messageId: payload.messageId,
              }),
            )
          },
        })

        partySocket.send(
          JSON.stringify({
            type: "add-icons-response",
            messageId: payload.messageId,
          }),
        )
      }

      if (payload.type === "install-files") {
        console.info("Installing files...")
        for (const file of payload.files) {
          try {
            await installFile(file, { targetDir: process.cwd() })
          } catch (error) {
            console.error(`Error writing file ${file.path}:`, error)
          }
        }

        partySocket.send(
          JSON.stringify({
            type: "install-files-response",
            messageId: payload.messageId,
          }),
        )
      }

      if (payload.type === "request-item-files") {
        const { libraryId, items } = payload
        try {
          const files = await getItemFiles(libraryId, items)
          partySocket.send(
            JSON.stringify({
              type: "item-files-response",
              files,
              messageId: payload.messageId,
            }),
          )
        } catch (error) {
          console.error("Error fetching item files:", error)
          partySocket.send(
            JSON.stringify({
              type: "item-files-response",
              error: "Failed to fetch item files",
              messageId: payload.messageId,
            }),
          )
        }
      }
    })
  })

async function getItemFiles(
  libraryId: string,
  itemKeys: string[],
): Promise<Record<string, string>> {
  const config = await getConfig()
  if (!config) {
    throw new Error("No config found")
  }

  const libraryConfig = resolveLibraryConfig(config, libraryId)
  if (!libraryConfig || !libraryConfig.directory) {
    throw new Error(`Library configuration not found for ${libraryId}`)
  }

  const directory = path.resolve(libraryConfig.directory)
  const files: Record<string, string> = {}

  for (const key of itemKeys) {
    const item = config.libraries[libraryId]?.items?.[key]
    if (!item) {
      console.error(`Item ${key} not found in library ${libraryId}`)
      continue
    }

    // Iterate over each file in the item
    for (const file of item.files || []) {
      const filePath = path.join(directory, file.path)
      try {
        const fileContent = await fs.readFile(filePath, "utf-8")
        files[`${key}:${file.path}`] = fileContent
      } catch (error) {
        if (error instanceof Error) {
          console.error(
            `Error reading file ${file.path} for item ${key}:`,
            error.message,
          )
          files[`${key}:${file.path}`] = `Error reading file: ${error.message}`
        }
      }
    }
  }

  return files
}
