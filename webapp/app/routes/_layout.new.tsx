import { useState } from "react"
import { Button } from "#app/components/ui/button.js"
import { redirect, useActionData } from "@remix-run/react"
import { Input } from "#app/components/ui/input.js"
import { Heading } from "#app/components/heading.js"
import { Octokit } from "@octokit/rest"
import { getUser } from "#app/auth.server.js"
import { parseRequest } from "#app/utils/parse-request.js"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarProvider,
} from "#app/components/ui/sidebar.js"
import { FileTreeMenu } from "#app/components/file-tree-menu.js"
import { z } from "zod"
import { BreadcrumbHandle } from "#app/components/ui/breadcrumbs.js"
import { Card } from "#app/components/ui/card.js"
import { FileEditor } from "#app/components/file-editor.js"
import { Icon } from "#app/components/icon.js"

export const handle: BreadcrumbHandle = {
  breadcrumb: "new",
}

const CreateGistSchema = z.object({
  intent: z.literal("create-gist"),
  description: z.string(),
  files: z.array(
    z.object({
      path: z.string(),
      content: z.string(),
      language: z.string().optional(),
    }),
  ),
})

const NewPkgSchema = z.object({
  intent: z.literal("new-pkg"),
  description: z.string(),
  files: z.array(
    z.object({
      path: z.string(),
      content: z.string(),
      language: z.string().optional(),
      type: z.enum(["file", "patch"]).optional().default("file"),
    }),
  ),
})

function sanitizeGistName(name: string) {
  return name.replaceAll("/", "\\")
}

export async function action({ request }: { request: Request }) {
  const submission = await parseRequest(request, {
    schema: z.discriminatedUnion("intent", [NewPkgSchema, CreateGistSchema]),
  })

  if (submission.status !== "success") {
    throw new Error("Invalid request")
  }

  if (submission.value.intent === "new-pkg") {
    return submission.value
  }

  if (submission.value.intent === "create-gist") {
    const { description, files } = submission.value

    const user = await getUser(request)
    if (!user) {
      throw new Error("User not authenticated")
    }

    const octokit = new Octokit({
      auth: user.tokens.access_token,
    })

    const gistFiles = Object.fromEntries(
      files.map((file) => [
        sanitizeGistName(file.name),
        { content: file.content },
      ]),
    )

    const response = await octokit.gists.create({
      description,
      public: true,
      files: gistFiles,
    })

    throw redirect(`/gist/${response.data.id}`)
  }
}

export default function CreatePackagePage() {
  const actionData = useActionData<typeof action>()
  const [files, setFiles] = useState(actionData?.files || [])
  const [description, setDescription] = useState(actionData?.description || "")
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [fileViewerState, setFileViewerState] = useState<"idle" | "preApply">(
    "idle",
  )
  const [search, setSearch] = useState("")

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-4">
      <Heading> New pkg </Heading>
      <Input
        placeholder="Title"
        className="font-mono shadow-smooth"
        name="description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <Card className="pt-0">
        <div className="overflow-hidden rounded-t-lg">
          <SidebarProvider className="relative">
            <div className="flex h-full grow">
              <Sidebar className="border-r absolute border-sidebar-border">
                <SidebarHeader className="p-1 border-b border-sidebar-border">
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search"
                    className="rounded-none rounded-tl-sm"
                  />
                </SidebarHeader>
                <SidebarContent>
                  <div className="flex flex-col h-full">
                    <div className="p-2 border-b border-sidebar-border">
                      <Button
                        type="button"
                        variant="ghost"
                        className="w-full justify-start text-xs"
                        onClick={() => {
                          const newFile = {
                            path: "untitled.js",
                            content: "",
                            language: "javascript",
                            type: "file",
                          }
                          setFiles([...files, newFile])
                          setSelectedFile(newFile.path)
                        }}
                      >
                        <Icon name="plus-circle" className="mr-2 size-4" />
                        New File
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="w-full justify-start text-xs"
                        onClick={() => {
                          const newPatch = {
                            path: "untitled.diff",
                            content: "",
                            language: "diff",
                            type: "patch",
                          }
                          setFiles([...files, newPatch])
                          setSelectedFile(newPatch.path)
                        }}
                      >
                        <Icon name="git-branch" className="mr-2 size-4" />
                        New Patch
                      </Button>
                    </div>
                    <FileTreeMenu
                      paths={files
                        .filter(({ path }) =>
                          path.toLowerCase().includes(search.toLowerCase()),
                        )
                        .map((file) => file.path.replaceAll("\\", "/"))}
                      onFileSelect={(path) => setSelectedFile(path)}
                    />
                  </div>
                </SidebarContent>
              </Sidebar>
              <div className="flex-1">
                {selectedFile ? (
                  <FileEditor
                    mode="write"
                    key={selectedFile}
                    file={{
                      path: selectedFile,
                      content:
                        files.find((f) => f.path === selectedFile)?.content ||
                        "",
                      type:
                        files.find((f) => f.path === selectedFile)?.type ||
                        "file",
                    }}
                    onChange={({ oldPath, newFile }) => {
                      setFiles((prevFiles) =>
                        prevFiles.map((file) =>
                          file.path === oldPath
                            ? {
                                ...file,
                                path: newFile.path,
                                content: newFile.content,
                              }
                            : file,
                        ),
                      )

                      if (oldPath !== newFile.path) {
                        setSelectedFile(newFile.path)
                      }
                    }}
                  />
                ) : null}
              </div>
            </div>
          </SidebarProvider>
        </div>
      </Card>

      <div className="flex items-center gap-x-4">
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            setFiles([
              ...files,
              { name: "", content: "", language: "plaintext", type: "file" },
            ])
          }
        >
          Add file
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            setFiles([
              ...files,
              { name: "patch", content: "", language: "diff", type: "patch" },
            ])
          }
        >
          Add patch
        </Button>
      </div>

      <div className="mt-8">
        <Button
          type="submit"
          variant="primary"
          name="intent"
          value="create-gist"
        >
          Create Gist
        </Button>
      </div>
    </div>
  )
}
