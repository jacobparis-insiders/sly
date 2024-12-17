import type * as Party from "partykit/server"

export default class Server implements Party.Server {
  constructor(readonly room: Party.Room) {
    console.log("[INIT] Server instance created", {
      id: room.id,
    })
  }

  // State to track CLI and app connections
  cliConnection: Party.Connection | null = null
  appConnections: Map<string, Party.Connection> = new Map()

  // Add new property to track message mappings
  private messageIdToAppId = new Map<string, string>()

  // Add a new property to store tags for each connection
  private connectionTags = new Map<string, string[]>()

  onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    console.log("[CONNECT]", ctx.request.url, conn.id)
    const url = new URL(ctx.request.url)
    const isCli = url.searchParams.has("cli")

    if (isCli) {
      console.log(
        "[CLI] Attempting new CLI connection:",
        conn.id,
        "ReadyState:",
        conn.readyState,
      )

      if (conn.readyState !== 1) {
        console.warn("[CLI] New connection not in OPEN state:", conn.readyState)
        return
      }

      // Temporarily store the previous connection
      const previousConnection = this.cliConnection

      console.log("[CLI] Setting new CLI connection:", conn.id)
      this.cliConnection = conn

      if (previousConnection) {
        console.log("[CLI] Replacing existing CLI connection:", {
          id: previousConnection.id,
          readyState: previousConnection.readyState,
        })

        try {
          previousConnection.send(JSON.stringify({ type: "disconnected" }))
          previousConnection.close()
        } catch (error) {
          console.error("[CLI] Error closing existing connection:", error)
        }
      }

      console.log("[CLI] New CLI connection verified:", {
        id: this.cliConnection.id,
        readyState: this.cliConnection.readyState,
      })

      try {
        this.cliConnection.send(JSON.stringify({ type: "connected" }))
        console.log("[CLI] Test message sent successfully")
      } catch (error) {
        console.error("[CLI] Failed to send test message:", error)
      }
    } else {
      const appId = conn.id
      this.appConnections.set(appId, conn)

      conn.send(JSON.stringify({ type: "connected", id: appId }))
      console.log("[APP] New app connected:", appId)
    }

    const tags = [
      // identify CLI explicitly
      isCli ? "cli" : "",
      // just for tracking where connections come from
      url.searchParams.get("source") || "",
    ].filter(Boolean)
    // Store the tags for the connection
    this.connectionTags.set(conn.id, tags)

    this.notifyConnectionStatus()
  }

  async onClose(connection: Party.Connection<unknown>): Promise<void> {
    console.log("[CLOSE] Connection closing:", {
      id: connection.id,
      readyState: connection.readyState,
      isCli: connection.id === this.cliConnection?.id,
      tags: JSON.stringify(this.connectionTags.get(connection.id) || []),
      timestamp: new Date().toISOString(),
    })

    if (this.cliConnection?.id === connection.id) {
      console.log("[CLI] CLI connection closing:", {
        id: this.cliConnection.id,
        readyState: this.cliConnection.readyState,
        timestamp: new Date().toISOString(),
      })

      // Skip clearing if a new CLI connection exists
      if (this.cliConnection !== connection) {
        console.log("[CLI] CLI connection already replaced, skipping clear")
        return
      }

      this.cliConnection = null
      console.log("[CLI] CLI connection cleared")
    } else if (this.appConnections.has(connection.id)) {
      this.appConnections.delete(connection.id)
      console.log("[APP] App disconnected:", connection.id, {
        tags: JSON.stringify(this.connectionTags.get(connection.id) || []),
      })
    } else {
      console.log("[CLOSE] Unrecognized connection closing:", connection.id)
    }

    this.notifyConnectionStatus()
  }

  async onMessage(message: string, sender: Party.Connection) {
    console.log("[MESSAGE] Message received:", message)

    let parsedMessage: { messageId?: string; content: string; type?: string }
    try {
      parsedMessage = JSON.parse(message)
    } catch (error) {
      console.warn("[ERROR] Invalid message format:", message)
      return
    }

    // Add immediate status response
    if (parsedMessage.type === "status") {
      const cliStatus = this.cliConnection
        ? {
            id: this.cliConnection?.id,
            readyState: this.cliConnection?.readyState,
          }
        : null

      console.log(
        `[STATUS] Reply to status request: ${parsedMessage.messageId}`,
      )
      sender.send(
        JSON.stringify({
          type: "status",
          cliStatus,
          apps: Array.from(this.appConnections.keys()),
          messageId: parsedMessage.messageId,
        }),
      )
      return
    } else {
      console.log("[MESSAGE] type:", parsedMessage.type)
    }

    const { messageId } = parsedMessage

    // App sends a message to CLI
    if (this.appConnections.has(sender.id)) {
      console.log("[APP->CLI] App message from", sender.id, ":", parsedMessage)

      if (this.cliConnection) {
        // Store the mapping of messageId to appId for the response
        if (messageId) {
          this.messageIdToAppId.set(messageId, sender.id)
        }

        this.cliConnection.send(message)
        console.log("[APP->CLI] Message sent to CLI")
      } else {
        console.warn(
          "[ERROR] No CLI connection found for app message from:",
          sender.id,
        )
        sender.send(
          JSON.stringify({
            error: "No CLI connection available",
            messageId,
          }),
        )
      }
    }

    // CLI sends a message to a specific app
    if (sender.id === this.cliConnection?.id) {
      console.log("[CLI->APP] CLI message:", parsedMessage)
      const targetId = this.messageIdToAppId.get(messageId)
      if (targetId) {
        const targetConnection = this.appConnections.get(targetId)
        if (targetConnection) {
          targetConnection.send(message)
        } else {
          console.warn("[ERROR] Target app not found:", targetId)
        }
      } else {
        console.warn("[ERROR] No app mapping found for messageId:", messageId)
      }
    }
  }
  private notifyConnectionStatus() {
    // Ensure CLI status is valid and ready before sending updates
    const cliStatus = this.cliConnection
      ? {
          id: this.cliConnection?.id,
          readyState: this.cliConnection?.readyState,
        }
      : null

    // Log the tags for each app connection
    const appStatuses = Object.fromEntries(
      Array.from(this.appConnections.entries()).map(([id, conn]) => [
        id,
        JSON.stringify(this.connectionTags.get(id) || []),
      ]),
    )

    console.log("[STATUS] Current connections:", {
      cli: cliStatus,
      apps: appStatuses,
      timestamp: new Date().toISOString(),
    })

    // Notify CLI about connected apps
    if (this.cliConnection) {
      console.log("[STATUS] Notifying CLI about connected apps")
      try {
        this.cliConnection.send(
          JSON.stringify({
            type: "status",
            apps: Array.from(this.appConnections.keys()),
          }),
        )
      } catch (error) {
        console.error(
          "[STATUS] Failed to notify CLI about connected apps:",
          error,
        )
      }
    }

    // Only notify apps about CLI connection status when CLI connects/disconnects
    // (not when other apps connect/disconnect)
    for (const conn of this.appConnections.values()) {
      try {
        conn.send(JSON.stringify({ type: "status", cliStatus }))
      } catch (error) {
        console.error(
          "[STATUS] Failed to notify app",
          conn.id,
          "about CLI status:",
          error,
        )
      }
    }
  }
}
