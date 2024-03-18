// http://localhost:3000

import "./tailwind.css"
import type { LinksFunction, LoaderFunctionArgs } from "@remix-run/node"
import {
  Link,
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  json,
  redirect,
  useLoaderData,
  useRouteLoaderData,
} from "@remix-run/react"
import { ButtonLink } from "./components/ButtonLink"
import { Icon } from "./components/icon"
import usePartySocket from "partysocket/react"
import { useState } from "react"
import { getValueFromCookie } from "./misc"

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url)
  let connectionId = url.searchParams.get("connectionId")
  if (connectionId) {
    throw redirect(url.pathname, {
      headers: {
        "Set-Cookie": `connectionId=${connectionId}; Path=/; HttpOnly; SameSite=Strict;`,
      },
    })
  } else {
    connectionId = getValueFromCookie(
      request.headers.get("Cookie"),
      "connectionId"
    )
  }

  return json({
    connectionId,
  })
}

export function useRootLoaderData() {
  const data = useRouteLoaderData<typeof loader>("root")

  if (!data) throw new Error("Missing root loader data")

  return data
}

export default function App() {
  const { connectionId } = useLoaderData<typeof loader>()

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
        <style>
          {`.bg-light {
          -webkit-backdrop-filter: blur(1.5rem) saturate(200%) contrast(50%) brightness(130%);
          backdrop-filter: blur(1.5rem) saturate(200%) contrast(50%) brightness(130%);
          background-color: rgba(255, 255, 255, 0.2);
        }`}
        </style>
      </head>
      <body className="[&_a]:font-bold [&_a]:text-black">
        <div>
          <div className="sticky top-0 z-30 mb-8 h-16">
            <div
              className="bg-light absolute inset-0 bottom-4"
              style={{
                WebkitMaskImage:
                  "linear-gradient(to bottom, black 0, black 3rem, transparent 3rem)",
              }}
            />
            <div className="py-1 relative z-10">
              <div className="max-w-5xl mx-auto px-4 flex justify-between">
                <div className="flex items-center">
                  <a href="/" className="text-2xl font-bold">
                    Sly CLI
                  </a>
                </div>
                <ul className="flex flex-row flex-wrap justify-center print:flex-col print:gap-2">
                  <li>
                    <ButtonLink
                      className="flex items-center rounded-3xl px-4 py-2"
                      to="https://github.com/jacobparis-insiders/sly"
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Icon name="brand-github" className="h-6 w-6">
                        <span className="hidden sm:inline">Github</span>
                      </Icon>
                    </ButtonLink>
                  </li>

                  <li>
                    <ButtonLink
                      className="flex items-center rounded-3xl px-4 py-2"
                      to="https://twitter.com/jacobmparis"
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Icon name="brand-twitter" className="h-6 w-6">
                        <span className="hidden sm:inline">Twitter</span>
                      </Icon>
                    </ButtonLink>
                  </li>
                </ul>
              </div>
              {connectionId ? (
                <div className="bg-white text-sm py-1 px-4 ">
                  <ConnectionStatus />
                </div>
              ) : null}
            </div>
          </div>
          <Outlet />
        </div>
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  )
}
function ConnectionStatus() {
  const { connectionId } = useRootLoaderData()
  const [connectionState, setConnectionState] = useState<
    "idle" | "connected" | "disconnected"
  >("idle")

  const ws = usePartySocket({
    host: "127.0.0.1:1999",
    room: `${connectionId}`,
    party: "cli",
    startClosed: !connectionId,

    // in addition, you can provide socket lifecycle event handlers
    // (equivalent to using ws.addEventListener in an effect hook)
    onOpen() {
      console.log("connected")
    },
    onMessage(e) {
      const message = JSON.parse(e.data)
      if (message.type === "connected") {
        setConnectionState("connected")
      } else if (message.type === "disconnected") {
        setConnectionState("disconnected")
      }
      console.log("message", e.data)
    },
    onClose() {
      console.log("closed")
    },
    onError(e) {
      console.log("error")
    },
  })

  return (
    <span className="flex items-center gap-x-2">
      {connectionState === "connected" ? (
        <>
          <span className="inline-block w-2 h-2 rounded-full bg-green-700" />{" "}
          Connected to CLI
          <Link to="/icons" className="ml-2 text-blue-600">
            Icons
          </Link>
          <Link to="/config" className="ml-2 text-blue-600">
            Config
          </Link>
        </>
      ) : (
        <>
          <span className="inline-block w-2 h-2 rounded-full bg-red-700" /> Not
          connected
        </>
      )}
    </span>
  )
}
