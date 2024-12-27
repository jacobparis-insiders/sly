import { type LoaderFunctionArgs } from "@remix-run/node"
import { useLoaderData } from "@remix-run/react"
import { invariant } from "@epic-web/invariant"
import { useState } from "react"
import { getConnection, useUpdateConfig } from "#app/use-connection.js"
import { patienceDiff } from "#app/utils/diff.js"
import { useCompletion } from "ai/react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#app/components/ui/select.tsx"
import { GitCompare, Scissors, Sparkle } from "lucide-react"
import { Button } from "#app/components/ui/button.tsx"
import { Slider } from "#app/components/ui/slider.tsx"
import { format } from "date-fns"
import { cn } from "#app/utils/misc.js"
import { PreDiffViewWithTokens } from "#app/components/pre-diff-view.js"
import { Icon } from "#app/components/icon.js"
import { db } from "#app/db.js"
import { tokenize, diffTokens } from "@pkgless/diff"
import { Card, CardHeader } from "#app/components/ui/card.js"

export async function loader({ request, params }: LoaderFunctionArgs) {
  const libraryId = params.libraryId
  invariant(libraryId, "Library ID is required")

  const library = db.libraries.find((lib) => lib.id === libraryId)
  invariant(library, "Library not found")

  const id = params.id
  invariant(id, "Item ID is required")

  const connection = await getConnection(request)
  try {
    const config = await connection?.getConfig()

    const item = config?.value?.libraries[libraryId]?.items?.[id]

    if (!item) {
      return {
        library,
        libraryId,
        config,
        files: [],
        registryFiles: [],
        id,
        item: null,
        name: null,
      }
    }

    const itemFiles = await connection?.getItemFiles(libraryId, [id])
    invariant(itemFiles, "No files found for item")

    const files = Object.entries(itemFiles.files).map(([key, content]) => {
      const [itemId, fileName] = key.split(":")
      return {
        name: fileName,
        content,
        isMain: !fileName,
      }
    })

    const registryUrl = library.itemUrl.replace("{name}", id)
    const registryResponse = await fetch(registryUrl, {
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!registryResponse.ok) {
      throw new Error(
        `Failed to fetch component from registry: ${registryResponse.statusText}`,
      )
    }

    const registryData = await registryResponse.json()

    // Compute diffs for each file and each version
    const filesWithDiffs = files.map((file) => {
      const registryFile = registryData.files.find((f) => f.path === file.name)
      const versions = [
        ...(registryFile?.history || []),
        {
          commit: registryFile.commit,
          hash: registryFile.hash,
          content: registryFile.content,
          timestamp: registryFile.timestamp,
        },
      ]

      const versionDiffs = versions.map((version) => {
        const diffArray = diffTokens({
          a: tokenize({
            content: version.content,
            language: "typescript",
          }),
          b: tokenize({
            content: file.content,
            language: "typescript",
          }),
        })
        return {
          commit: version.commit,
          diffArray,
        }
      })

      // Find the file configuration with a matching filename
      const fileConfig = item.files?.find((f) => f.path === file.name)

      // Generate diff for base vs registry
      const baseContent = getHistoricalVersionContentFromHistory(
        versions,
        fileConfig?.version,
      )
      const baseVsRegistryDiff = diffTokens({
        a: tokenize({
          content: baseContent,
          language: "typescript",
        }),
        b: tokenize({
          content: registryFile.content,
          language: "typescript",
        }),
      })

      return {
        ...file,
        versionDiffs,
        baseVsRegistryDiff,
      }
    })

    return {
      id: item.id,
      name: item.name,
      libraryId,
      files: filesWithDiffs,
      registryFiles: registryData.files,
      config,
    }
  } finally {
    connection?.close()
  }
}

export default function ItemPage() {
  const { libraryId, id, config, name, files, registryFiles } =
    useLoaderData<typeof loader>()

  // const messages = usePartyMessages({ type: "update-config-response" })
  if (!files.length) return <div className="p-6">No item files found</div>

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold mb-2">{name || "Unnamed Item"}</h1>
        </div>
      </div>

      <div className="space-y-6">
        {files.map((file) => (
          <FileCard
            key={file.name}
            libraryId={libraryId}
            id={id}
            file={file}
            registryFiles={registryFiles}
            currentVersion={null}
            config={config}
          />
        ))}
      </div>
    </div>
  )
}

function SliderView({
  file,
  versions,
  version,
  onSetVersion,
}: {
  file: any
  versions: any
  version?: string
  onSetVersion: (version: string) => void
}) {
  const [selectedVersionIndex, setSelectedVersionIndex] = useState<number>(
    () => {
      if (version) {
        return versions.findIndex((entry) => entry.commit === version) || 0
      } else {
        const exactMatchIndex = versions.findIndex(
          (version) => version.content === file.content,
        )
        return exactMatchIndex !== -1 ? exactMatchIndex : 0
      }
    },
  )

  const handleSliderChange = (value: number[]) => {
    setSelectedVersionIndex(value[0])
  }

  const selectedVersion = versions[selectedVersionIndex]
  const selectedDiff = file.versionDiffs.find(
    (diff) => diff.commit === selectedVersion.commit,
  )

  return (
    <>
      <Button
        type="button"
        onClick={() => {
          onSetVersion(selectedVersion.commit)
        }}
        variant="outline"
      >
        Set version
      </Button>

      <Card className={cn("font-mono py-0")}>
        <CardHeader
          className={cn(
            "flex flex-col justify-between px-2 py-2 shadow-smooth border-b",
          )}
        >
          <div className="flex items-center gap-x-2 px-2">
            <span className="font-bold">patch</span>
            <span className="font-medium">{file.name}</span>
          </div>
          <div className="flex items-center gap-2 px-2 mt-2">
            <div className="space-y-4 w-full">
              <p className="text-sm text-muted-foreground">
                Adjust the slider until the diff only shows your own
                customizations.
              </p>
              <div className="relative z-10">
                <Slider
                  id="version-slider"
                  min={0}
                  max={versions.length - 1}
                  step={1}
                  value={[selectedVersionIndex]}
                  onValueChange={handleSliderChange}
                  className="w-full"
                />
                <div className="absolute w-full flex justify-between top-3 px-[9px] -z-10">
                  {versions.map((_, index) => (
                    <div
                      key={index}
                      className={cn("border-l-2 h-2 border-neutral-300")}
                    />
                  ))}
                </div>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{format(versions[0].timestamp, "MMM d, yyyy")}</span>
                <span>
                  {format(
                    versions[versions.length - 1].timestamp,
                    "MMM d, yyyy",
                  )}
                </span>
              </div>
            </div>
          </div>
        </CardHeader>
        <div className="font-mono text-sm">
          {selectedDiff ? (
            <PreDiffViewWithTokens diffArray={selectedDiff.diffArray} />
          ) : (
            <div className="px-4 py-2">
              File contents match registry exactly
            </div>
          )}
        </div>
      </Card>
    </>
  )
}

function NonSliderView({
  file,
  baseContent,
  registryFile,
}: {
  file: any
  baseContent: string
  registryFile?: any
}) {
  // TODO: make reusable hook
  const [diffExtracted, setDiffExtracted] = useState(false)

  const [hasRebased, setHasRebased] = useState(false)
  const { completion, isLoading, complete } = useCompletion({
    api: "/api/rebase",
  })

  if (isLoading && !hasRebased) {
    setHasRebased(true)
  }

  const rebaseDiff = () => {
    const registryFileContent = (registryFile?.content || "").split("\n")

    const diff = patienceDiff(baseContent, registryFileContent)

    // Format the diff results for the API
    const formattedDiff = diff.lines
      .map((line) => {
        if (line.aIndex === -1) {
          return `+${line.line}`
        } else if (line.bIndex === -1) {
          return `-${line.line}`
        }
        return ` ${line.line}`
      })
      .join("\n")

    complete(
      JSON.stringify({
        diff: formattedDiff,
        base: file.content,
      }),
    )
  }

  const [comparisonType, setComparisonType] =
    useState<string>("base-vs-registry")

  // if there's no newer version, always compare to current
  const changedContent =
    (registryFile ? comparisonType : "base-vs-current") === "base-vs-registry"
      ? registryFile?.content
      : file.content

  const isExactMatch = baseContent === changedContent

  // const completionDiffLines = completion
  //   ? patienceDiff(
  //       file.content.split("\n").slice(0, completion.split("\n").length),
  //       completion.split("\n"),
  //     ).lines.map((part) =>
  //       part.bIndex === -1
  //         ? `- ${part.line}`
  //         : part.aIndex === -1
  //           ? `+ ${part.line}`
  //           : `  ${part.line}`,
  //     )
  //   : []

  return (
    <Card className={cn("font-mono py-0")}>
      <div>
        <CardHeader
          className={cn(
            "flex justify-between px-2 py-2",
            diffExtracted && "shadow-smooth border-b",
          )}
        >
          <div className="flex items-center gap-x-2 px-2">
            <span className="font-bold">patch</span>
            <span className="font-medium">{file.name}</span>
          </div>

          <div className="flex items-center gap-2">
            {registryFile && (
              <Select value={comparisonType} onValueChange={setComparisonType}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue>
                    <span className="flex items-center gap-2">
                      <GitCompare className="h-4 w-4" />
                      {comparisonType === "base-vs-registry"
                        ? "Update"
                        : "Current"}
                    </span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="base-vs-registry">Update</SelectItem>
                  <SelectItem value="base-vs-current">Current</SelectItem>
                </SelectContent>
              </Select>
            )}

            <Button
              type="button"
              variant="outline"
              className="shadow-smooth"
              onClick={() => setDiffExtracted(!diffExtracted)}
              disabled={comparisonType === "base-vs-current"}
            >
              {diffExtracted ? (
                <Icon name="x" className="-ml-2 size-4" />
              ) : (
                <Scissors className="-ml-2 size-4" />
              )}
              {diffExtracted ? "cancel" : "diff"}
            </Button>
            {diffExtracted && (
              <Button
                type="button"
                variant="outline"
                className="shadow-smooth"
                onClick={rebaseDiff}
              >
                <Icon name="play" className="-ml-2 size-4" />
                continue
              </Button>
            )}
          </div>
        </CardHeader>
      </div>

      <div className="text-sm pt-4 px-4">
        {isExactMatch ? (
          <div className="py-2">File contents match registry exactly </div>
        ) : (
          <PreDiffViewWithTokens diffArray={file.baseVsRegistryDiff} />
        )}
      </div>
    </Card>
  )
}

function FileCard({
  libraryId,
  id,
  file,
  registryFiles,
  config,
}: {
  libraryId: string
  id: string
  file: any
  registryFiles: any
  config: any
}) {
  const { updateConfig } = useUpdateConfig()

  // TODO: reconcile file.name and file.path
  const fileConfig = config.value.libraries[libraryId].items[id].files.find(
    (f) => f.path === file.name,
  )
  const registryFile = registryFiles.find((f) => f.path === file.name)

  const [isSliderView, setIsSliderView] = useState<boolean>(
    fileConfig.version ? false : true,
  )

  const versions = [
    ...(registryFile?.history || []),
    {
      commit: registryFile.commit,
      hash: registryFile.hash,
      content: registryFile.content,
      timestamp: registryFile.timestamp,
    },
  ]

  const baseContent = getHistoricalVersionContentFromHistory(
    versions,
    fileConfig.version,
  )

  const isLatestVersion = fileConfig.version === registryFile.commit

  return (
    <div key={file.name} className="w-full max-w-4xl">
      {isSliderView ? (
        <SliderView
          file={file}
          versions={versions}
          version={fileConfig.version}
          onSetVersion={(version) => {
            fileConfig.version = version
            updateConfig({
              value: config.value,
            })
            setIsSliderView(false)
          }}
        />
      ) : (
        <>
          {/* TODO: could consider moving this inside the component as children */}
          <Button variant="outline" onClick={() => setIsSliderView(true)}>
            Change version
          </Button>
          <NonSliderView
            file={file}
            registryFile={isLatestVersion ? null : registryFile}
            baseContent={baseContent}
          />
        </>
      )}
    </div>
  )
}

function getHistoricalVersionContentFromHistory(
  history: Array<{ commit: string; content: string }>,
  version: string,
): string {
  const versionEntry = history.find((entry) => entry.commit === version)
  return versionEntry ? versionEntry.content : ""
}
