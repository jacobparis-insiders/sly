import { useState } from "react"
import { Button } from "#app/components/ui/button.js"
import { Form, redirect, useActionData } from "@remix-run/react"
import { Input } from "#app/components/ui/input.js"
import { Heading } from "#app/components/heading.js"
import { Octokit } from "@octokit/rest"
import { getUser } from "#app/auth.server.js"
import { CodeEditor } from "#app/components/code-editor.js"
import { parseRequest } from "#app/utils/parse-request.js"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarProvider,
  SidebarTrigger,
} from "#app/components/ui/sidebar.js"
import { FileTreeMenu } from "#app/components/file-tree-menu.js"
import { z } from "zod"
import { useEffect } from "react"
import { BreadcrumbHandle } from "#app/components/ui/breadcrumbs.js"
import { Card } from "#app/components/ui/card.js"

export const handle: BreadcrumbHandle = {
  breadcrumb: "new",
}

const CreateGistSchema = z.object({
  intent: z.literal("create-gist"),
  description: z.string(),
  files: z.array(
    z.object({
      name: z.string(),
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
      name: z.string(),
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
  const [content, setContent] = useState("")

  useEffect(() => {
    if (selectedFile) {
      const fileContent =
        files.find((file) => file.name === selectedFile)?.content || ""
      setContent(fileContent)
    }
  }, [selectedFile, files])

  return (
    <Form method="POST" className="max-w-5xl mx-auto p-4 space-y-4">
      <Heading> New pkg </Heading>
      <Input
        placeholder="Title"
        className="font-mono shadow-smooth"
        name="description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <Card className="pt-0">
        <div className="overflow-hidden  rounded-t-lg">
          <SidebarProvider className="relative">
            <div className="flex h-full grow">
              <Sidebar className="border-r absolute border-sidebar-border">
                <SidebarHeader className="p-0 border-b border-sidebar-border">
                  <Input
                    placeholder="Search"
                    className="text-sm font-medium h-9 text-muted-foreground rounded-none border-none focus:ring-0"
                  />
                </SidebarHeader>
                <SidebarContent>
                  <FileTreeMenu
                    paths={files.map((file) => file.name.replaceAll("\\", "/"))}
                    onFileSelect={(path) => setSelectedFile(path)}
                  />
                </SidebarContent>
              </Sidebar>
              <div className="flex-1">
                <div className="px-1 py-1 border-b border-sidebar-border flex gap-x-2 items-center mb-2">
                  <div className="flex items-center gap-x-2">
                    <SidebarTrigger />
                    <h2 className="text-sm text-muted-foreground">
                      {selectedFile}
                    </h2>
                  </div>

                  <div className="flex items-center gap-x-2">
                    <Button type="button" variant="outline">
                      Diff
                    </Button>
                  </div>
                </div>
                <CodeEditor
                  value={content}
                  onChange={(value) => {
                    const newFiles = files.map((file) =>
                      file.name === selectedFile
                        ? { ...file, content: value || "" }
                        : file,
                    )
                    setFiles(newFiles)
                    setContent(value || "")
                  }}
                />
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
    </Form>
  )
}
