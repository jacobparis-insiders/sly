// http://localhost:3000/icons

import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node"
import { Form, json, redirect, useLoaderData } from "@remix-run/react"
import { useRootLoaderData } from "~/root"
import { libraryIndexSchema } from "~/schemas"

export async function action({ request, params }: ActionFunctionArgs) {
  const library = params["*"]
  if (!library) {
    throw new Response("Not found", { status: 400 })
  }

  const connectionId = getValueFromCookie(
    request.headers.get("Cookie"),
    "connectionId"
  )

  const body = await request.formData()
  const name = body.get("name")
  console.log({
    type: "add",
    connectionId,
    library: "@radix-ui/icons",
    items: [name],
  })

  await fetch(`http://0.0.0.0:1999/parties/cli/${connectionId}`, {
    method: "POST",
    body: JSON.stringify({
      type: "add",
      connectionId,
      library: "@radix-ui/icons",
      items: [name],
    }),
  })

  return json({
    message: "success",
  })
}

function getValueFromCookie(cookie: string | null, key: string) {
  if (!cookie) return null
  return (
    cookie
      .split(";")
      .find((c) => c.trim().startsWith(`${key}=`))
      ?.split("=")[1] ?? null
  )
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  const url = new URL(request.url)

  const library = params["*"]
  if (!library) {
    throw new Response("Not found", { status: 404 })
  }

  // fetch the library from this url
  // http://localhost:3000/registry/@radix-ui/icons.json
  // http://localhost:3000/icons/@radix-ui/icons.json

  const libraryUrl = new URL(`/registry/${library}.json`, url.origin)

  const results = await fetch(libraryUrl)
    .then((response) => response.json())
    .then((response) => libraryIndexSchema.parseAsync(response))

  return json({
    library: results,
  })
}

export default function Index() {
  const { library } = useLoaderData<typeof loader>()

  return (
    <div className="flex mx-auto max-w-5xl px-4 flex-col text-neutral-600">
      <h1 className="mt-16 font-bold text-3xl text-neutral-600">
        Icon libraries available on Sly
      </h1>

      <div className="flex flex-wrap gap-4 mt-4">
        {library.resources.map((resource) => (
          <Form
            action={`/icons/${library.meta.name}`}
            method="POST"
            key={resource.name}
            className="px-2 py-2 rounded-3xl border border-neutral-200"
          >
            <input type="hidden" name="name" value={resource.name} />

            <div className="flex items-center">
              <div className="flex flex-col">
                <span className="font-bold">{resource.name}</span>
              </div>
            </div>
            <div className="flex items-center mt-2">
              <button
                type="submit"
                className="text-sm text-neutral-500 bg-neutral-100 hover:bg-neutral-200 rounded-2xl px-4 py-2"
              >
                Add
              </button>
            </div>
          </Form>
        ))}
      </div>
    </div>
  )
}
