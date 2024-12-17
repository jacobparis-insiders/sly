import { db } from "#app/db.js"
import { invariant } from "@epic-web/invariant"
import { LoaderFunctionArgs } from "@remix-run/node"

export async function loader({ params }: LoaderFunctionArgs) {
  const library = db.libraries.find((lib) => lib.id === params.id)
  // TODO: proper 404
  invariant(library, "Library not found")

  return Response.json(library)
}
