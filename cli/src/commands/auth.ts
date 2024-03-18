import { Command } from "commander"
import PartySocket from "partysocket"
import WS from "ws"
import { z } from "zod"
import { addItemsFromLibrary } from "./add.js"
import { v4 as uuid } from "uuid"
import { getConfig } from "../get-config.js"
import { ConfigResponseSchema } from "site/app/schemas.js"

const AddCommandSchema = z.object({
  type: z.literal("add"),
  library: z.string(),
  items: z.array(z.string()),
})

const ConnectedSchema = z.object({
  type: z.literal("connected"),
})

const ConfigSchema = z.object({
  type: z.literal("config"),
})

const MessageSchema = z.discriminatedUnion("type", [
  AddCommandSchema,
  ConnectedSchema,
  ConfigSchema,
])
export const authCommand = new Command()
  .name("auth")
  .description(`Log in to Sly`)
  .hook("preAction", () => {
    // This runs before every command, so this is our global state
    process.env.YES = "true"
    process.env.OVERWRITE = "true"
  })
  .action(async () => {
    console.info("Waiting for session…")
    const room = uuid()
    const partySocket = new PartySocket({
      host: "127.0.0.1:1999",
      room,
      party: "cli",
      query: {
        cli: "true",
      },
      WebSocket: WS,
    })

    // print each incoming message from the server to console
    partySocket.addEventListener("message", async (event: { data: string }) => {
      const payload = MessageSchema.parse(JSON.parse(event.data))
      if (payload.type === "connected") {
        console.info("Successfully logged in to", room)
        console.info(
          "Browse icons at ",
          `http://localhost:3000/icons/@radix-ui/icons?connectionId=${room}`
        )
      }

      if (payload.type === "add") {
        console.info("Adding", payload.items.join(", "))
        try {
          await addItemsFromLibrary({
            library: payload.library,
            items: payload.items,
          })
        } catch (error) {
          console.error(error)
        }
      }

      if (payload.type === "config") {
        const config = await getConfig()

        partySocket.send(
          JSON.stringify(
            ConfigResponseSchema.parse({
              type: "config-response",
              value: config,
            })
          )
        )
      }
    })
  })
