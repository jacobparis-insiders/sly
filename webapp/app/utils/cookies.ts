import { createCookie } from "@remix-run/node"

export const configCookie = createCookie("app-config", {
  maxAge: 34560000, // 400 days
})
