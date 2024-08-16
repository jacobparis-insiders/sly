import chalk from "chalk"

export function printPatch(patch: string, options: { filename: string }) {
  return patch
    .split("\n")
    .map((line) => {
      if (line.startsWith("@@")) {
        const startingLine = line.slice(4).split(",")[0]
        return (
          chalk.magenta(line) +
          (options.filename ? ` ${options.filename}:${startingLine}` : "")
        )
      }

      if (line.startsWith("+")) {
        return chalk.green(line.slice(1))
      }

      if (line.startsWith("-")) {
        return chalk.red(line.slice(1))
      }

      if (line.startsWith(" ")) {
        return chalk.dim(line.slice(1))
      }

      return line
    })
    .join("\n")
}
