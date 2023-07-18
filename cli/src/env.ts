/**
 * @tutorial https://www.jacobparis.com/content/type-safe-env
 */
import { z, TypeOf } from "zod"
const zodEnv = z.object({
  REGISTRY_URL: z.string().optional(),
  CACHE_DIRECTORY: z.string().optional(),
})

declare global {
  namespace NodeJS {
    interface ProcessEnv extends TypeOf<typeof zodEnv> {}
  }
}
try {
  zodEnv.parse(process.env)
} catch (err) {
  if (err instanceof z.ZodError) {
    const { fieldErrors } = err.flatten()
    const errorMessage = Object.entries(fieldErrors)
      .map(([field, errors]) =>
        errors ? `${field}: ${errors.join(", ")}` : field
      )
      .join("\n  ")
    console.error(`Missing environment variables:\n  ${errorMessage}`)
    process.exit(1)
  }
}
