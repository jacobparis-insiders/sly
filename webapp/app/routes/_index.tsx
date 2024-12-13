import { DiamondLightsOut } from "#app/components/diamond-lights-out.js"
import { Button } from "#app/components/ui/button.js"
import { useCliInfo } from "#app/use-connection.js"
import { useCopyToClipboard } from "#app/utils/use-copy-to-clipboard.js"
import { Form, Link } from "@remix-run/react"
import { Terminal } from "#app/components/terminal.js"
import { FadeIn } from "#app/components/fade-in.js"
import { usePartyMessages } from "#app/party.js"
import { useConnectionId } from "#app/root.js"

export default function Index() {
  const connectionId = useConnectionId()
  const { state: initialState, cwd } = useCliInfo()
  const statusMessages = usePartyMessages({ type: "status" })
  const lastStatusMessage = statusMessages.at(-1)
  // Determine the state based on lastStatusMessage
  const state =
    lastStatusMessage && lastStatusMessage.cliStatus === null
      ? "error"
      : initialState

  const showContent = connectionId
    ? state === "success" || state === "error"
    : true

  return (
    <div>
      <div className="bg-diamond absolute inset-0" />
      <div className="relative grid grid-cols-[repeat(auto-fit,_100px)] justify-center">
        <DiamondLightsOut />

        <FadeIn
          show={showContent}
          delay={0}
          className="col-span-full w-full relative z-10 mx-auto my-auto flex h-svh max-w-7xl flex-1 flex-col items-start justify-center px-4 sm:px-6 lg:px-8"
        >
          <h1 className="text-5xl font-bold drop-shadow-smooth">pkgless</h1>
          <FadeIn show={showContent} delay={150} className="w-full">
            {cwd ? <LoggedInTerminal cwd={cwd} /> : <LoginTerminal />}
            <p>{state}</p>
          </FadeIn>
        </FadeIn>
      </div>
    </div>
  )
}

function LoginTerminal() {
  const [copied, copy] = useCopyToClipboard()

  return (
    <>
      <Terminal className="mt-4 shadow-smooth">
        <span className="select-none">&gt;&nbsp;</span>
        <span className="relative -left-[2ch] inline-block">
          &nbsp;&nbsp;npx pkgless login
        </span>
        <button
          type="button"
          onClick={() => copy("npx pkgless login")}
          className={`absolute right-4 top-1/2 -translate-y-1/2 transition-colors ${
            copied ? "text-white" : "hover:text-gray-400"
          }`}
          aria-label="Copy to clipboard"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </Terminal>
      <p className="text-sm text-neutral-500 mt-2">
        Run in your project's terminal to connect
      </p>
    </>
  )
}

function LoggedInTerminal({ cwd }: { cwd: string }) {
  return (
    <>
      <Terminal className="mt-4 shadow-smooth">
        <div>
          <span className="select-none">&gt;&nbsp;</span>
          <span className="relative -left-[2ch] inline-block">
            &nbsp;&nbsp;npx pkgless login
          </span>
        </div>
        <div>
          <span>Connected to </span>
          <span className="font-mono">{cwd}</span>
        </div>
      </Terminal>

      <Button
        className="mt-2 font-mono shadow-smooth font-bold"
        variant="outline"
        asChild
      >
        <Link to="/dashboard">browse {cwd}</Link>
      </Button>

      <Form method="POST" action="/api/disconnect">
        <Button
          className="mt-2 font-mono shadow-smooth font-bold"
          variant="outline"
          type="submit"
        >
          exit
        </Button>
      </Form>
    </>
  )
}
