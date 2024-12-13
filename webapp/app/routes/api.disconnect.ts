import { redirect } from "@remix-run/node"
import type { ActionFunctionArgs } from "@remix-run/node"
import { cookieSessionStorage } from "./api.connect.$id"

export async function action({ request, params }: ActionFunctionArgs) {
  const session = await cookieSessionStorage.getSession(
    request.headers.get("Cookie"),
  )

  // TODO: use safeRedirectTo
  return redirect("/", {
    headers: {
      "Set-Cookie": await cookieSessionStorage.destroySession(session),
    },
  })
}
