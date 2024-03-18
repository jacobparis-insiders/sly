import type * as Party from "partykit/server"

declare const DEVMODE: boolean
// DEVMODE will be true in local dev, and false in production
// read package.json to see how this is set

export default class Server implements Party.PartyKitServer {
  static async onFetch(request: Party.Request) {
    // when developing locally, we simply proxy all
    // non-party requests to the vite dev server
    if (DEVMODE) {
      const url = new URL(request.url)
      url.hostname = "localhost"
      url.port = "5173"
      return fetch(url.toString(), request as unknown as Request)
    }

    // You could also add additional api handlers here.

    return new Response("Not found", { status: 404 })
  }
}
