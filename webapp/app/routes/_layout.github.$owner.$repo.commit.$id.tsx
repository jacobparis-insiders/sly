import { data, type LoaderFunctionArgs } from "@remix-run/node"
import { useLoaderData, useNavigate } from "@remix-run/react"
import { Octokit } from "@octokit/rest"
import { invariant } from "@epic-web/invariant"
import { Button } from "#app/components/ui/button.js"
import { FadeIn } from "#app/components/fade-in.js"
import { cn } from "#app/utils/misc.js"
import { BreadcrumbHandle } from "#app/components/ui/breadcrumbs.js"
import { Heading } from "#app/components/heading.js"
import { Card, CardHeader } from "#app/components/ui/card.js"
import { CodeEditor } from "#app/components/code-editor.js"
import {
  useInstallFiles,
  useUpdateConfig,
  useConfig,
  useFileTree,
} from "#app/use-connection.js"
import { useState, useMemo } from "react"
import { getUser } from "#app/auth.server.js"
import { Link } from "@remix-run/react"
import { AutoDiffEditor } from "#app/components/diff-editor.js"
import ignore from "ignore"
import {
  fetchCommitDetails,
  fetchCommitFiles,
} from "#app/utils/octokit.server.ts"
import { cachified, lru } from "#app/cache.server.js"
import { ansiToDiff } from "#app/utils/ansi-to-diff.js"

export const handle: BreadcrumbHandle = {
  breadcrumb: " ",
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { owner, repo, id } = params
  invariant(owner, "No owner found in params")
  invariant(repo, "No repo found in params")
  invariant(id, "No commit ID found in params")

  const user = await getUser(request)
  const octokit = new Octokit({
    auth: user?.tokens.access_token,
  })

  const data = await fetchCommitDetails({
    octokit,
    owner,
    repo,
    commitSha: id,
  })

  const files = await Promise.all(
    data.files?.map(async (file) => {
      console.log(file.patch)
      return {
        type: "file",
        path: file.filename,
        content: await cachified({
          cache: lru,
          key: `rediff-1-${file.sha}`,
          getFreshValue: () =>
            fetch(`${process.env.DIFF_URL}/rediff`, {
              method: "POST",
              body: JSON.stringify({
                unifiedDiff: file.patch,
                ext: file.filename.split(".").pop(),
              }),
            })
              .then((res) => res.text())
              .then((text) => {
                //                 console.log(`
                // test("test", () => {
                //   const input = \``)
                //                 console.log({ text })
                //                 console.log(`\`
                //   const output = ansiToDiff(input)
                //   expect(output).toMatchInlineSnapshot()
                // })`)
                const diff = ansiToDiff(text)
                return diff
              }),
        }),
      }
    }) ?? [],
  )

  return {
    breadcrumbLabel: data.commit.message,
    commit: {
      ...data,
      files,
    },
  }
}

export default function CommitPage() {
  const { updateConfigPartial } = useUpdateConfig()
  const { config } = useConfig()
  const { commit } = useLoaderData() as Awaited<ReturnType<typeof loader>>
  const navigate = useNavigate()
  const { files: projectFiles } = useFileTree()
  console.log(config?.ignore)
  const ig = ignore().add(config?.ignore || [])

  // Convert projectFiles to a Set for faster lookup
  const projectFilesSet = useMemo(
    () => new Set(projectFiles?.map((file) => file.slice(1))),
    [projectFiles],
  )

  const { installFiles, state: installState } = useInstallFiles()

  return (
    <div className="p-6">
      <FadeIn show className="max-w-3xl">
        <Heading>{commit.commit.message || "Unnamed Commit"}</Heading>

        <div>
          {commit.files.map((file) => {
            console.log(file.path)
            const isIgnored = ig.test(file.path).ignored
            const isNonMatching = !projectFilesSet.has(file.path)

            return (
              <AutoDiffEditor
                isIgnored={isIgnored}
                isNonMatching={isNonMatching}
                key={file.path}
                className="mt-4 pt-0 shadow-smooth"
                file={{
                  path: file.path,
                  content: file.content || "",
                  type: file.type,
                }}
                version={commit.sha}
                onIgnore={(version, ignorePattern) => {
                  if (ignorePattern) {
                    updateConfigPartial({
                      jsonata: `$merge([$, {"ignore": $append($exists(ignore) ? ignore : [], "${ignorePattern}")}])`,
                    })
                  }
                }}
                onSaveFile={({ newFile }) => {
                  console.log("onSaveFile", newFile)
                  installFiles({
                    files: commit.files.map((f) =>
                      f.path === file.path
                        ? {
                            ...f,
                            content: newFile.content,
                            type: newFile.type,
                          }
                        : f,
                    ),
                  })
                }}
              />
            )
          })}
        </div>

        <div className="flex justify-between mt-8">
          <Button variant="outline" asChild className="shadow-smooth">
            <Link to="prev">← Previous Commit</Link>
          </Button>

          <Button
            type="button"
            variant="primary"
            className="shadow-smooth"
            onClick={() => {
              updateConfigPartial({
                jsonata: `$merge([$,{"template": $merge([template,{ "version": "${commit.sha}" }])}])`,
              })
              navigate("next")
            }}
          >
            Done with this commit
          </Button>
        </div>
      </FadeIn>
    </div>
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

export function Line({
  line,
  className,
}: {
  line: string
  className?: string
}) {
  return (
    <div
      className={cn(
        "px-4 transition-all duration-100 ",
        {
          "text-green-600 dark:text-green-600 bg-green-500/5":
            line.startsWith("+"),
          "text-red-600 dark:text-red-600 bg-red-500/5": line.startsWith("-"),
          "opacity-30": !line.startsWith("+") && !line.startsWith("-"),
        },
        className,
      )}
      style={{ whiteSpace: "pre-wrap" }}
    >
      {line}
    </div>
  )
}
