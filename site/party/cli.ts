import type * as Party from "partykit/server"
import { z } from "zod"
import { ConfigResponseSchema } from "~/schemas"

const InstallSchema = z.object({
  type: z.literal("add"),
  library: z.string(),
  items: z.array(z.string()),
  connectionId: z.string(),
})

const ConfigRequestSchema = z.object({
  type: z.literal("config"),
})

export default class Server implements Party.Server {
  constructor(readonly room: Party.Room) {}

  getConnectionTags(
    connection: Party.Connection<unknown>,
    context: Party.ConnectionContext
  ): string[] | Promise<string[]> {
    const url = new URL(context.request.url)

    if (url.searchParams.has("cli")) {
      return ["cli"]
    }

    return []
  }
  onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    // A websocket just connected!
    console.log(
      `Connected:
  id: ${conn.id}
  room: ${this.room.id}
  url: ${new URL(ctx.request.url).pathname}`
    )

    // let's send a message to the connection
    // send number of connections
    const connectedClis = this.room.getConnections("cli")

    conn.send(
      JSON.stringify({
        type:
          Array.from(connectedClis).length > 0 ? "connected" : "disconnected",
      })
    )
  }

  onClose(connection: Party.Connection<unknown>): void | Promise<void> {
    const connectedClis = this.room.getConnections("cli")

    this.room.broadcast(
      JSON.stringify({
        type:
          Array.from(connectedClis).length > 0 ? "connected" : "disconnected",
      })
    )
  }

  async onMessage(message: string, sender: Party.Connection) {
    // let's log the message
    console.log(`connection ${sender.id} sent message: ${message}`)
    // as well as broadcast it to all the other connections in the room...
    this.room.broadcast(
      `${sender.id}: ${message}`,
      // ...except for the connection it came from
      [sender.id]
    )
  }

  async onRequest(request: Party.Request) {
    if (request.method === "GET") {
      const url = new URL(request.url)
      const payload = ConfigRequestSchema.parse(
        Object.fromEntries(url.searchParams.entries())
      )

      if (payload.type === "config") {
        const connectedClis = Array.from(this.room.getConnections("cli"))
        if (connectedClis.length !== 1) {
          throw new Error("Expected exactly one connected CLI")
        }

        // Send request to CLI and wait for response
        const response = await this.requestConfigFromCLI(connectedClis[0])
        console.log({ response })
        return new Response(JSON.stringify(response.value))
      }
    }

    if (request.method === "POST") {
      const payload = InstallSchema.parse(await request.json())

      this.room.broadcast(
        JSON.stringify({
          type: "add",
          library: payload.library,
          items: payload.items,
        })
      )

      return new Response("OK")
    }

    return new Response("Method not allowed", { status: 405 })
  }

  requestConfigFromCLI<T>(
    cli: Party.Connection<T>
  ): Promise<z.infer<typeof ConfigResponseSchema>> {
    cli.send(
      JSON.stringify({
        type: "config",
      })
    )

    return new Promise((resolve, reject) => {
      cli.addEventListener("message", (response) => {
        console.log("received config response", response)
        try {
          const parsedResponse = ConfigResponseSchema.parse(
            typeof response.data === "string"
              ? JSON.parse(response.data)
              : response.data.toString()
          )
          resolve(parsedResponse)
        } catch (error) {
          reject(error)
        }
      })
    })
  }
}

Server satisfies Party.Worker
