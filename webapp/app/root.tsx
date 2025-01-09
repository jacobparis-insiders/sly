import {
  Links,
  Meta,
  Outlet,
  redirect,
  Scripts,
  ScrollRestoration,
  useMatches,
  useRouteLoaderData,
} from "@remix-run/react"
import { Analytics } from "@vercel/analytics/react"
import tailwind from "#app/tailwind.css?url"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

import type { LoaderFunctionArgs } from "@vercel/remix"
import { getConnectionId } from "./use-connection"
import { PartyProvider } from "./party"
import { getUser } from "./auth.server"

export const shouldRevalidate = () => false
export async function loader({ request }: LoaderFunctionArgs) {
  // this contains the ?connectionId=... guard
  // and will bind it to a cookie then redirect without the param
  const connectionId = await getConnectionId(request)
  const user = await getUser(request)

  return { connectionId, user }
}

export function useRootLoaderData() {
  return useRouteLoaderData<typeof loader>("root")!
}

export function useConnectionId() {
  return useRootLoaderData().connectionId
}

export function useOptionalUser() {
  return useRootLoaderData().user
}

export function useUser() {
  const user = null

  if (!user) {
    throw redirect("/login")
  }

  return user
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="stylesheet" href={tailwind} />
        <Meta />
        <Links />
      </head>
      <body className="content-visible">
        {children}
        <ScrollRestoration />
        <Scripts />
        <Analytics />
      </body>
    </html>
  )
}

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <PartyProvider>
        <Outlet />
      </PartyProvider>
    </QueryClientProvider>
  )
}
