import type { LoaderFunctionArgs } from "@remix-run/node"

export async function loader({ params }: LoaderFunctionArgs) {
  const path = params["*"]
  console.log(params)
  return new Response("registry", {
    headers: {
      "Content-Type": "text/plain",
    },
  })
}

function parsePath(path: string) {
  const parts = path.split("/")

  const filename = parts.pop()
  const library = parts.join("/")

  return { library, filename }
}
