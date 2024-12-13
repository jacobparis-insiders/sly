import { useNavigate } from "@remix-run/react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card"
import { Icon } from "./icon"

// New component to reduce duplication
export function ComponentLibraryCard({
  library,
  lib,
}: {
  library: string
  lib: {
    type: "component"
    name: string
    items: Record<string, unknown>
    registryUrl?: string
  }
}) {
  const libraryUrl = `/component/${library}?registryUrl=${encodeURIComponent(
    lib.registryUrl || "",
  )}`
  const navigate = useNavigate()

  return (
    <Card onClick={() => navigate(libraryUrl)} className="hover:bg-neutral-50">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Icon name="box" className="h-5 w-5 mr-2" />
          {lib.name || library}
        </CardTitle>
        <CardDescription>
          {Object.keys(lib.items || {}).length} items
        </CardDescription>
      </CardHeader>
    </Card>
  )
}
