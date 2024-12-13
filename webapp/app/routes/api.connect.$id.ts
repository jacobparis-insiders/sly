import { createCookieSessionStorage, redirect } from "@vercel/remix"
import type { ActionFunctionArgs } from "@vercel/remix"

export const cookieSessionStorage = createCookieSessionStorage({
  cookie: {
    maxAge: 604_800, // one week
    isSigned: false,
    secure: false,
  },
})

export async function action({ request, params }: ActionFunctionArgs) {
  const connectionId = params.id
  const body = await request.json()

  const redirectTo = body.redirectTo
  const session =
    (await cookieSessionStorage.getSession(request.headers.get("Cookie"))) || {}
  session.set("id", connectionId)

  // TODO: use safeRedirectTo
  return redirect(decodeURIComponent(redirectTo ?? "/"), {
    headers: {
      "Set-Cookie": await cookieSessionStorage.commitSession(session),
    },
  })
}
