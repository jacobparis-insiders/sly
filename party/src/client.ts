import PartySocket from "partysocket"

declare const PARTYKIT_HOST: string

let pingInterval: ReturnType<typeof setInterval>

// Let's append all the messages we get into this DOM element
const output = document.getElementById("app") as HTMLDivElement

// Helper function to add a new line to the DOM
function add(text: string) {
  output.appendChild(document.createTextNode(text))
  output.appendChild(document.createElement("br"))
}
