import { configCookie } from "#app/utils/cookies.js"
import { json, type ActionFunctionArgs } from "@remix-run/node"

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData()
  const configJson = formData.get("config")

  if (typeof configJson !== "string") {
    return json({ error: "Invalid config" }, { status: 400 })
  }

  const config = JSON.parse(configJson)

  return json(
    { success: true },
    {
      headers: {
        "Set-Cookie": await configCookie.serialize(config),
      },
    },
  )
}
