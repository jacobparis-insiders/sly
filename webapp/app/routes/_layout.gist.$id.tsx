import { type LoaderFunctionArgs } from "@remix-run/node"
import { Form, useLoaderData } from "@remix-run/react"
import { Octokit } from "@octokit/rest"
import { invariant } from "@epic-web/invariant"
import { Button } from "#app/components/ui/button.js"
import { Icon } from "#app/components/icon.js"
import { Terminal } from "#app/components/terminal.js"
import { FadeIn } from "#app/components/fade-in.js"
import { cn } from "#app/utils/misc.js"
import { BreadcrumbHandle } from "#app/components/ui/breadcrumbs.js"
import { Heading } from "#app/components/heading.js"
import { Card, CardHeader } from "#app/components/ui/card.js"
import { CodeEditor } from "#app/components/code-editor.js"
import { useSpinDelay } from "spin-delay"
import { usePartyMessages } from "#app/party.js"
import { useInstallFiles } from "#app/use-connection.js"
import { useCopyToClipboard } from "#app/utils/use-copy-to-clipboard.js"
import { useState } from "react"
import { Line } from "#app/components/pre-diff-view.js"
import { cachified } from "#app/cache.server.js"
import { getUser } from "#app/auth.server.js"

export const handle: BreadcrumbHandle = {
  breadcrumb: " ",
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { id } = params
  invariant(id, "No gist ID found in params")

  const user = await getUser(request)
  const octokit = new Octokit({
    auth: user?.tokens.access_token,
  })
  const { data } = await cachified({
    key: `gist-${id}`,
    getFreshValue: () => octokit.gists.get({ gist_id: id }),
    ttl: 1000 * 60 * 60 * 24, // 1 day
  })

  invariant(data.files, "No files found in gist")
  return { breadcrumbLabel: data.description, gist: data }
}

export default function GistPage() {
  const { gist } = useLoaderData<typeof loader>()
  const [copied, copyToClipboard] = useCopyToClipboard()
  const { installFiles, state: installState } = useInstallFiles()
  const isRunning = useSpinDelay(installState === "loading", {
    delay: 100,
    minDuration: 1000,
  })
  const messages = usePartyMessages({ type: "add-icons-response-log" })
  const [confirmState, setConfirmState] = useState(false)

  if (!gist) return <div className="p-6">No gist found</div>

  const installCommand = `npx pkgless add gist ${gist.id}`

  const files = Object.entries(gist.files).map(([filename, file]) => ({
    type: "file",
    path: filename.replaceAll("\\", "/"),
    content: file!.content,
  }))

  const hasPatchFiles = files.some((file) => file.path.endsWith(".diff"))

  return (
    <div className="p-6">
      <FadeIn show className="max-w-3xl">
        <div className="flex justify-between items-center">
          <Heading>{gist.description || "Unnamed Gist"}</Heading>
        </div>

        <Terminal>{installCommand}</Terminal>

        <div className="flex gap-x-2 items-center mt-2">
          {confirmState ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setConfirmState(false)
                }}
              >
                Apply patches
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const filesWithoutPatches = files.filter(
                    (file) => file.type !== "patch",
                  )
                  installFiles({ files: filesWithoutPatches })
                  setConfirmState(false)
                }}
              >
                Install without patches
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                className={cn(
                  "shadow-smooth transition-colors gap-4",
                  isRunning &&
                    "hover:bg-black bg-black text-white hover:text-white",
                )}
                onClick={() => {
                  if (hasPatchFiles) {
                    setConfirmState(true)
                  } else {
                    installFiles({ files })
                  }
                }}
              >
                <Icon name="play" className="-ml-2 size-4" />
                Run
              </Button>

              <Button
                type="button"
                variant="outline"
                className={cn(
                  "shadow-smooth transition-colors",
                  copied &&
                    "hover:bg-white border-green-500/40 hover:border-green-500/40 hover:text-green-800",
                )}
                onClick={() => copyToClipboard(installCommand)}
              >
                <Icon
                  name={copied ? "copy-check" : "copy"}
                  className={cn("-ml-2 size-4")}
                />
                copy
              </Button>

              <Form method="POST" action="/new">
                <input type="hidden" name="intent" value="new-pkg" />
                <input
                  type="hidden"
                  name="description"
                  value={gist.description || ""}
                />
                {Object.entries(gist.files).map(
                  ([filename, file]: [string, any], index) => (
                    <>
                      <input
                        type="hidden"
                        name={`files[${index}].name`}
                        value={filename}
                      />
                      <input
                        type="hidden"
                        name={`files[${index}].content`}
                        value={file.content}
                      />
                      <input
                        type="hidden"
                        name={`files[${index}].language`}
                        value={file.language?.toLowerCase()}
                      />
                      <input
                        type="hidden"
                        name={`files[${index}].type`}
                        value={filename.endsWith(".diff") ? "patch" : "file"}
                      />
                    </>
                  ),
                )}
                <Button
                  type="submit"
                  variant="outline"
                  className="shadow-smooth transition-colors"
                >
                  <Icon name="plus-circle" className="-ml-2 size-4" />
                  duplicate
                </Button>
              </Form>

              <Button
                variant="outline"
                className="shadow-smooth transition-colors"
                asChild
              >
                <a
                  href={gist.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Icon name="github" className="-ml-2 size-4" />
                  view on github
                </a>
              </Button>
            </>
          )}
        </div>

        {messages.length > 0 && (
          <div className="mt-2">
            {messages.map((log) => (
              <div key={log.messageId}>{log.message}</div>
            ))}
          </div>
        )}

        <div>
          {Object.entries(gist.files).map(([filename, file]: [string, any]) =>
            filename.endsWith(".diff") ? (
              <PatchCard name={filename} file={file} className="mt-4" />
            ) : (
              <FileCard file={file} className="mt-4" />
            ),
          )}
        </div>
      </FadeIn>
    </div>
  )
}

export function PatchCard({
  name,
  file,
  className,
}: {
  name: string
  file: { path: string; content: string; language: string }
  className?: string
}) {
  const lines = file.content.split("\n")
  return (
    <Card className={cn("font-mono", className)}>
      <CardHeader className="justify-between">
        <div className="flex items-center gap-x-2 px-2">
          <span className="font-bold">patch</span>
          <span className="font-medium">{name}</span>
        </div>

        <Button type="button" variant="outline" className="shadow-smooth">
          <Icon name="play" className="-ml-2 size-4" />
          apply
        </Button>
      </CardHeader>

      <pre className={cn("overflow-auto text-sm mt-2")}>
        {lines.map((line, index) => (
          <Line key={index} line={line} />
        ))}
      </pre>
    </Card>
  )
}

export function FileCard({
  file,
  className,
}: {
  file: { path: string; content: string; language: string }
  className?: string
}) {
  return (
    <Card className={cn("font-mono", className)}>
      <CardHeader>
        <Heading>{file.path}</Heading>
      </CardHeader>
      <CodeEditor
        language={file.language}
        value={file.content}
        options={{ readOnly: true }}
      />
    </Card>
  )
}
