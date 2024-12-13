import { authenticator } from "#app/auth.server.js"
import { Icon } from "#app/components/icon.js"
import { Button } from "#app/components/ui/button.js"
import { useOptionalUser } from "#app/root.js"
import { Form } from "@remix-run/react"
import {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  redirect,
} from "@remix-run/node"
import { ComponentProps } from "react"

export async function action({ request }: ActionFunctionArgs) {
  let user = await authenticator.authenticate("github", request)

  let session = await sessionStorage.getSession(request.headers.get("cookie"))
  session.set("user", user)

  throw redirect("/", {
    headers: { "Set-Cookie": await sessionStorage.commitSession(session) },
  })
}

export async function loader({ request }: LoaderFunctionArgs) {
  let session = await sessionStorage.getSession(request.headers.get("cookie"))
  let user = session.get("user")
  if (user) throw redirect("/dashboard")
  return null
}

export default function Login() {
  return <GitHubLoginButton />
}

export function GitHubLoginButton(
  props: Omit<
    ComponentProps<typeof Button>,
    "type" | "children" | "variant" | "asChild"
  >,
) {
  const user = useOptionalUser()

  if (user) {
    return (
      <Button type="button" variant="outline" {...props}>
        <Icon name="github" className="w-4 h-4" />
        Connected
      </Button>
    )
  }

  return (
    <Form method="POST" action="/auth/github" className="contents">
      <Button type="submit" variant="outline" {...props}>
        <Icon name="github" className="w-4 h-4" />
        Connect GitHub
      </Button>
    </Form>
  )
}
