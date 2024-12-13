import { useState } from "react"
import { Button } from "#app/components/ui/button.js"
import { Card, CardHeader } from "#app/components/ui/card.js"
import { Form, redirect, useActionData } from "@remix-run/react"
import { Input } from "#app/components/ui/input.js"
import { Heading } from "#app/components/heading.js"
import { Trash2 } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#app/components/ui/select.js"
import { BreadcrumbHandle } from "#app/components/ui/breadcrumbs.js"
import { Octokit } from "@octokit/rest"
import { getUser } from "#app/auth.server.js"
import { CodeEditor } from "#app/components/code-editor.js"
import { SimpleDiffView } from "#app/components/pre-diff-view.js"
import { useCompletion } from "ai/react"
import { z } from "zod"
import { parseRequest } from "#app/utils/parse-request.js"

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
    // TODO: show error on-screen
    throw new Error("Invalid request")
  }

  if (submission.value.intent === "new-pkg") {
    // Pass the value into actionData so we can pre-fill the form
    // This should be a GET request, but we run into URL length issues
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

    // TODO: any sanitation for what kind of gists we can create?
    // It is their own Github account
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

  const addFile = () => {
    setFiles([
      ...files,
      { name: "", content: "", language: "plaintext", type: "file" },
    ])
  }

  const addPatch = () => {
    setFiles([
      ...files,
      { name: "patch", content: "", language: "diff", type: "patch" },
    ])
  }

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index))
  }

  const updateFileName = (index: number, name: string) => {
    const newFiles = [...files]
    newFiles[index].name = name
    newFiles[index].language = getLanguageFromFileName(name)
    setFiles(newFiles)
  }

  const updateFileContent = (index: number, content: string) => {
    const newFiles = [...files]
    newFiles[index].content = content
    setFiles(newFiles)
  }

  const updateFileType = (index: number, type: "file" | "patch") => {
    const newFiles = [...files]
    newFiles[index].type = type

    setFiles(newFiles)
  }

  const getLanguageFromFileName = (fileName: string): string => {
    const extension = fileName.split(".").pop()?.toLowerCase()
    switch (extension) {
      case "js":
        return "javascript"
      case "ts":
        return "typescript"
      case "py":
        return "python"
      case "html":
        return "html"
      case "css":
        return "css"
      case "json":
        return "json"
      case "diff":
        return "diff"
      case "patch":
        return "diff"
      default:
        return "plaintext"
    }
  }

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

      {files.map((file, index) =>
        file.type === "file" ? (
          <EditFileCard
            key={index}
            file={file}
            index={index}
            onUpdateFileName={updateFileName}
            onUpdateFileContent={updateFileContent}
            onUpdateFileType={updateFileType}
            onRemoveFile={removeFile}
          />
        ) : (
          <EditPatchCard
            key={index}
            file={file}
            index={index}
            onUpdateFileContent={updateFileContent}
            onUpdateFileType={updateFileType}
            onRemoveFile={removeFile}
            onUpdateFileName={updateFileName}
          />
        ),
      )}

      <div className="flex items-center gap-x-4">
        <Button type="button" variant="outline" onClick={addFile}>
          Add file
        </Button>
        <Button type="button" variant="outline" onClick={addPatch}>
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

interface GistFile {
  name: string
  content: string
  language: string
  type: "file" | "patch"
}

interface EditFileCardProps {
  file: GistFile
  index: number
  onUpdateFileName: (index: number, name: string) => void
  onUpdateFileContent: (index: number, content: string) => void
  onUpdateFileType: (index: number, type: "file" | "patch") => void
  onRemoveFile: (index: number) => void
}

// Add new type for patch states
type PatchState = "diff" | "rebase" | "applying" | "complete"

function EditFileCard({
  file,
  index,
  onUpdateFileName,
  onUpdateFileContent,
  onUpdateFileType,
  onRemoveFile,
}: EditFileCardProps) {
  return (
    <Card className="pt-0">
      <CardHeader className="border-b p-2 bg-muted/30 flex-row items-center gap-2">
        <Select
          value={file.type}
          onValueChange={(value: "file" | "patch") =>
            onUpdateFileType(index, value)
          }
        >
          <SelectTrigger className="w-[100px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="file">File</SelectItem>
            <SelectItem value="patch">Patch</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder="Full path to file..."
          className="flex-1 font-mono"
          name={`files[${index}].name`}
          value={file.name}
          onChange={(e) => onUpdateFileName(index, e.target.value)}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-destructive ml-auto"
          onClick={() => onRemoveFile(index)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CodeEditor
        name={`files[${index}].content`}
        className="py-2"
        language={file.language}
        value={file.content}
        onChange={(value) => onUpdateFileContent(index, value || "")}
      />
    </Card>
  )
}

function EditPatchCard({
  file,
  index,
  onUpdateFileContent,
  onUpdateFileType,
  onRemoveFile,
  onUpdateFileName,
}: EditFileCardProps) {
  const { completion, isLoading, complete } = useCompletion({
    api: "/api/rebase",
  })

  const [patchState, setPatchState] = useState<PatchState>("diff")
  const [baseContent, setBaseContent] = useState("")
  const [hasRebased, setHasRebased] = useState(false)

  if (isLoading && !hasRebased) {
    setHasRebased(true)
  }

  const applyPatch = () => {
    complete(
      JSON.stringify({
        diff: file.content,
        base: baseContent,
      }),
    )
    setPatchState("applying")
  }

  return (
    <Card className="pt-0">
      <CardHeader className="border-b p-2 bg-muted/30 flex-row items-center gap-2">
        <Select
          value={file.type}
          onValueChange={(value: "file" | "patch") => {
            onUpdateFileType(index, value)
            if (value === "file") setPatchState("complete")
          }}
        >
          <SelectTrigger className="w-[100px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="file">File</SelectItem>
            <SelectItem value="patch">Patch</SelectItem>
          </SelectContent>
        </Select>

        <Input
          placeholder="Full path to file..."
          className="flex-1 font-mono"
          name={`files[${index}].name`}
          value={file.name}
          onChange={(e) => onUpdateFileName(index, e.target.value)}
        />

        {patchState === "diff" && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setPatchState("rebase")}
            className="ml-auto"
          >
            Next: Add Base Content
          </Button>
        )}
        {patchState === "rebase" && (
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPatchState("diff")}
              className="ml-auto"
            >
              Back
            </Button>
            <Button type="button" variant="outline" onClick={applyPatch}>
              Apply Changes
            </Button>
          </>
        )}
        {(patchState === "applying" || patchState === "complete") && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setPatchState("rebase")}
            className="ml-auto"
          >
            Back
          </Button>
        )}

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-destructive ml-2"
          onClick={() => onRemoveFile(index)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardHeader>

      {patchState === "diff" && (
        <CodeEditor
          className="py-2"
          language="diff"
          value={file.content}
          name={`files[${index}].content`}
          onChange={(value) => onUpdateFileContent(index, value || "")}
        />
      )}

      {patchState === "rebase" && (
        <CodeEditor
          className="py-2"
          language="plaintext"
          value={baseContent}
          onChange={(value) => setBaseContent(value || "")}
        />
      )}

      {patchState === "applying" && (
        <SimpleDiffView
          baseContent={baseContent}
          changedContent={completion || ""}
        />
      )}

      {patchState === "complete" && (
        <CodeEditor
          className="py-2"
          language={file.language}
          value={file.content}
          name={`files[${index}].content`}
          onChange={(value) => onUpdateFileContent(index, value || "")}
        />
      )}
    </Card>
  )
}
