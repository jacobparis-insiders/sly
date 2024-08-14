export function trimCwd(path: string) {
  return path.replace(process.cwd(), "")
}
