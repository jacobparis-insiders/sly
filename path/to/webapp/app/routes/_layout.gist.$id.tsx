import { /* existing imports */ } from "react"

/* ... existing code ... */

export default function GistPage() {
  const { gist, files: initialFiles } = useLoaderData<typeof loader>()
  const [files, setFiles] = useState(initialFiles)
  const [copied, copyToClipboard] = useCopyToClipboard()
  const { installFiles, state: installState } = useInstallFiles()
  const isRunning = useSpinDelay(installState === "loading", {
    delay: 100,
    minDuration: 1000,
  })
  const [confirmState, setConfirmState] = useState(false)
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null)
  const [baseContent, setBaseContent] = useState<string | null>(null) // New state for baseContent

  const [fileViewerState, setFileViewerState] = useState<"idle" | "applying">(
    "idle",
  )
  const { files: _projectFiles } = useFileTree()
  const projectFiles = _projectFiles.map((file) => ({
    path: file.replace(/^\//, ""),
    content: "",
    type: "file",
  }))
  const [selectedProjectPath, setSelectedProjectPath] = useState<string | null>(
    null,
  )
  const { state, file: projectFile } = useFile(selectedProjectPath)

  // Update baseContent when projectFile changes
  useEffect(() => {
    if (fileViewerState === "applying" && projectFile) {
      setBaseContent(projectFile.content)
    }
  }, [projectFile, fileViewerState])

  if (!gist) return <div className="p-6">No gist found</div>

  /* ... existing code ... */

  return (
    <div className="p-6">
      {/* ... existing JSX ... */}
      <FileViewer
        selectedFile={matchesState(fileViewerState, "diff.applying")
          ? {
              type: "file",
              path: selectedProjectPath,
              content: state === "success" ? projectFile.content : "loading…",
              language: "typescript",
            }
          : files.find((file) => file.path === selectedFilePath)}
        onFileSelect={(path) => {
          if (matchesState(fileViewerState, "diff.applying")) {
            setSelectedProjectPath(path)
            // Update baseContent instead of selectedFilePath
            const selected = projectFiles.find((f) => f.path === path)
            if (selected) {
              setBaseContent(selected.content)
            }
          } else {
            setSelectedFilePath(path)
          }
        }}
        /* ... existing props ... */
      />
      {/* ... existing JSX ... */}
    </div>
  )
} 
