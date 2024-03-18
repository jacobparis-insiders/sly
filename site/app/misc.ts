export function getValueFromCookie(cookie: string | null, key: string) {
  if (!cookie) return null
  return (
    cookie
      .split(";")
      .find((c) => c.trim().startsWith(`${key}=`))
      ?.split("=")[1] ?? null
  )
}
