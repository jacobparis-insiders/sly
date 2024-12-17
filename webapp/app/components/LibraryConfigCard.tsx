"use client"

import { useState } from "react"
import { Card, CardContent } from "#app/components/ui/card"
import { Input } from "#app/components/ui/input"
import { Button } from "#app/components/ui/button"
import { ScrollArea } from "#app/components/ui/scroll-area"
import { Label } from "#app/components/ui/label"

interface LibraryConfig {
  name: string
  directory: string
  postinstall: string
}

type CardState = "editing" | "readOnly" | "creatingTemplate"

export default function LibraryConfigCard({
  libraryName,
}: {
  libraryName: string
}) {
  const [savedConfigs, setSavedConfigs] = useState<LibraryConfig[]>([])
  const [currentConfig, setCurrentConfig] = useState<LibraryConfig>({
    name: "",
    directory: "",
    postinstall: "",
  })
  const [templateName, setTemplateName] = useState("")
  const [cardState, setCardState] = useState<CardState>("editing")

  const handleSave = () => {
    console.log("Saving configuration:", currentConfig)
    setCardState("readOnly")
  }

  const handleCreateTemplate = () => {
    setCardState("creatingTemplate")
  }

  const handleSubmitTemplate = () => {
    if (templateName) {
      const newConfig = { ...currentConfig, name: templateName }
      setSavedConfigs([...savedConfigs, newConfig])
      setCurrentConfig(newConfig)
      setCardState("readOnly")
      setTemplateName("")
    }
  }

  const handleLoadConfig = (config: LibraryConfig) => {
    setCurrentConfig(config)
    setCardState("readOnly")
  }

  const handleEdit = () => {
    setCardState("editing")
  }

  const handleCancel = () => {
    if (cardState === "creatingTemplate") {
      setTemplateName("")
    }
    setCardState("editing")
  }

  return (
    <Card className="w-full max-w-[300px]">
      <CardContent className="pt-4 space-y-3">
        <h2 className="text-lg font-semibold">{libraryName}</h2>

        {savedConfigs.length > 0 && (
          <ScrollArea className="h-16 w-full">
            <div className="flex flex-wrap gap-2">
              {savedConfigs.map((config) => (
                <Button
                  key={config.name}
                  variant="outline"
                  size="sm"
                  className="text-sm py-1 px-2 h-7"
                  onClick={() => handleLoadConfig(config)}
                >
                  {config.name}
                </Button>
              ))}
            </div>
          </ScrollArea>
        )}

        {cardState === "readOnly" ? (
          <>
            <div className="space-y-1">
              <Label className="text-sm font-medium">Directory</Label>
              <p className="text-sm">{currentConfig.directory || "Not set"}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-sm font-medium">Postinstall script</Label>
              <p className="text-sm">
                {currentConfig.postinstall || "Not set"}
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-1">
              <Label htmlFor="directory" className="text-sm font-medium">
                Directory
              </Label>
              <Input
                id="directory"
                placeholder="Directory"
                value={currentConfig.directory}
                onChange={(e) =>
                  setCurrentConfig({
                    ...currentConfig,
                    directory: e.target.value,
                  })
                }
                className="text-sm h-8 px-2"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="postinstall" className="text-sm font-medium">
                Postinstall script
              </Label>
              <Input
                id="postinstall"
                placeholder="Postinstall script"
                value={currentConfig.postinstall}
                onChange={(e) =>
                  setCurrentConfig({
                    ...currentConfig,
                    postinstall: e.target.value,
                  })
                }
                className="text-sm h-8 px-2"
              />
            </div>
          </>
        )}

        {cardState === "editing" ? (
          <Button
            onClick={handleCreateTemplate}
            variant="link"
            className="text-sm p-0 h-6 w-full justify-start"
          >
            Create Template
          </Button>
        ) : cardState === "creatingTemplate" ? (
          <Button
            onClick={handleCancel}
            variant="link"
            className="text-sm p-0 h-6 w-full justify-start"
          >
            Cancel
          </Button>
        ) : null}

        {cardState === "creatingTemplate" ? (
          <div className="flex gap-2">
            <Input
              placeholder="Template name"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="text-sm h-8 px-2 flex-grow"
            />
            <Button
              onClick={handleSubmitTemplate}
              disabled={!templateName}
              className="text-sm py-1 px-2 h-8"
            >
              Submit
            </Button>
          </div>
        ) : cardState === "readOnly" ? (
          <Button onClick={handleEdit} className="w-full text-sm py-1 px-2 h-8">
            Edit
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              className="flex-1 text-sm py-1 px-2 h-8"
            >
              Save
            </Button>
            <Button
              onClick={handleCancel}
              variant="outline"
              className="flex-1 text-sm py-1 px-2 h-8"
            >
              Cancel
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
