import { z } from "zod"
import { parseWithZod } from "@conform-to/zod"
import { Submission } from "@conform-to/react"

export async function parseRequest<ZodSchema>(
  request: Request,
  { schema }: { schema: z.ZodType<ZodSchema> },
) {
  const type = request.headers.get("content-type")
  if (type === "application/json") {
    const payload = (await request.json()) as Record<string, unknown>
    const value = await schema.safeParseAsync(payload)
    if (value.success) {
      return {
        status: "success",
        payload,
        value: value.data,
        reply: () => ({
          status: "success",
          initialValue: payload,
          value: value.data,
        }),
      } satisfies Submission<ZodSchema>
    } else {
      return {
        status: "error",
        payload,
        error: value.error.errors.reduce(
          (result, e) => {
            result[String(e.path)] = [e.message]
            return result
          },
          {} as Record<string, Array<string>>,
        ),
        reply: () => ({
          status: "error",
          initialValue: payload,
          error: value.error.errors.reduce(
            (result, e) => {
              result[String(e.path)] = [e.message]
              return result
            },
            {} as Record<string, Array<string>>,
          ),
        }),
      } as Submission<ZodSchema>
    }
  }
  const formData = await request.formData()
  return parseWithZod(formData, { schema })
}
