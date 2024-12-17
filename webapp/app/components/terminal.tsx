import { useOptionalCli } from "#app/use-connection.js"
import { cn } from "#app/utils/misc.js"

export function Terminal({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "bg-black rounded-lg font-mono px-6 py-4 text-white max-w-prose w-full text-left relative",
        className,
      )}
    >
      {children}
    </div>
  )
}

export function ConnectedTerminal({
  children,
  ...props
}: {
  children?:
    | React.ReactNode
    | ((props: { prompt: React.ReactNode }) => React.ReactNode)
} & Omit<React.ComponentProps<typeof Terminal>, "children">) {
  const { cwd, state } = useOptionalCli()

  const prompt = (
    <div className="text-rose-400/90">
      {state === "loading"
        ? "Connecting…"
        : state === "success"
          ? cwd
          : "Connection failed"}
    </div>
  )
  return (
    <Terminal {...props}>
      {typeof children === "function" ? (
        children({ prompt })
      ) : (
        <>
          {prompt}
          {children}
        </>
      )}
    </Terminal>
  )
}
