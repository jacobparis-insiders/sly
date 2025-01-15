import { type LoaderFunctionArgs } from "@remix-run/node"
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
} from "#app/use-connection.js"
import { useState } from "react"
import { cachified } from "#app/cache.server.js"
import { getUser } from "#app/auth.server.js"
import { Link } from "@remix-run/react"
import { AutoDiffEditor } from "#app/components/diff-editor.js"
import { minimatch } from "minimatch"
import ignore from "ignore"

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

  const { data } = await cachified({
    key: `commit-${owner}-${repo}-${id}`,
    getFreshValue: () =>
      octokit.repos.getCommit({
        owner,
        repo,
        ref: id,
      }),
    ttl: 1000 * 60 * 60 * 24, // 1 day
  })

  invariant(data.files, "No files found in commit")
  return { breadcrumbLabel: data.commit.message, commit: data }
}

export default function CommitPage() {
  const { updateConfigPartial } = useUpdateConfig()
  const { config } = useConfig()
  const { commit } = useLoaderData<typeof loader>()
  const navigate = useNavigate()
  // Create an ignore instance with the config patterns
  const ig = ignore().add(config?.ignore || [])

  const files = commit.files.map((file) => ({
    type: "file",
    path: file.filename,
    content: file.patch || "",
  }))

  const [completedFiles, setCompletedFiles] = useState<Set<string>>(
    new Set(
      commit.files
        ?.filter((file) => {
          return !ig.test(file.filename)
        })
        .map((file) => file.filename),
    ),
  )

  console.log(config)
  const allFilesCompleted = files.every((file) => completedFiles.has(file.path))
  const { installFiles, state: installState } = useInstallFiles()

  return (
    <div className="p-6">
      <FadeIn show className="max-w-3xl">
        <Heading>{commit.commit.message || "Unnamed Commit"}</Heading>

        <div>
          {files.map((file) => (
            <AutoDiffEditor
              collapsed={completedFiles.has(file.path)}
              key={file.path}
              className="mt-4 pt-0 shadow-smooth"
              file={file}
              version={commit.sha}
              onIgnore={(version, ignorePattern) => {
                setCompletedFiles((prev) => new Set([...prev, file.path]))
                if (ignorePattern) {
                  updateConfigPartial({
                    jsonata: `$merge([$, {"ignore": $append($exists(ignore) ? ignore : [], "${ignorePattern}")}])`,
                  })
                }
              }}
              onSaveFile={({ newFile }) => {
                console.log("onSaveFile", newFile)
                setCompletedFiles((prev) => new Set([...prev, file.path]))
                installFiles({
                  files: files.map((f) =>
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
          ))}
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
