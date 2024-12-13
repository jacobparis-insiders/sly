import { authenticator } from "#app/auth.server.js"
import { ActionFunctionArgs, redirect } from "@remix-run/node"

export async function action({ request }: ActionFunctionArgs) {
  await authenticator.logout(request, { redirectTo: "/" })
  return redirect("/")
}
