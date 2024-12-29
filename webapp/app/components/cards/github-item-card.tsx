import { useNavigate } from "@remix-run/react"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "#app/components/ui/card.tsx"
import { Icon } from "../icon"

export function GithubItemCard({
  item,
}: {
  item: {
    type: "gist" | "repo"
    url: string
    files: Record<
      string,
      {
        filename: string
        type: string
        language: string
        raw_url: string
        size: number
      }
    >
    content: string
    updated_at: string
    description: string
  }
}) {
  const navigate = useNavigate()
  const href =
    item.type === "gist"
      ? `/gist?url=${encodeURIComponent(item.url)}`
      : `/gist/${item.id}`

  const files = Object.entries(item.files)
  const singleFile = files.length === 1
  const [sampleFilename, sampleContent] = files[0]
  const snippet = ""
  return (
    <Card
      onClick={() => navigate(href)}
      className="hover:bg-neutral-50 overflow-hidden"
    >
      <CardHeader className="pb-0">
        <CardTitle className="flex items-center text-lg truncate">
          <Icon name="github" className="h-5 w-5 mr-2" />
          {item.description}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {singleFile && snippet ? (
          <div className="mb-4">
            <div className="flex items-center space-x-2 mb-1">
              <Icon name="file" className="h-4 w-4" />
              <span className="font-medium text-sm">{files[0][0]}</span>
            </div>
            <div
              className="relative bg-white font-mono text-xs overflow-hidden"
              style={{ height: "80px" }}
            >
              <div className="absolute inset-0 bg-linear-to-b from-transparent via-transparent to-white z-10" />
              <pre className="overflow-hidden">
                <code>{snippet}</code>
              </pre>
            </div>
          </div>
        ) : (
          files.map(([file, content], index) => (
            <div key={index} className="flex items-center space-x-2 mb-1">
              <Icon name="file" className="h-4 w-4" />
              <span className="font-medium text-sm">{file}</span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
