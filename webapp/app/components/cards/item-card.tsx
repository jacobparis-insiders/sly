import { Link, useNavigate } from "@remix-run/react"
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "#app/components/ui/card.tsx"
import { Icon } from "../icon"

export function ItemCard({
  item,
  index,
}: {
  index: number
  item: {
    url: string
    files: Array<{
      path: string
      content: string
      language: string
    }>
    content: string
    updated_at: string
    description: string
  }
}) {
  const navigate = useNavigate()
  const href = `/items/${index}`

  return (
    <Card
      onClick={() => navigate(href)}
      className="hover:bg-neutral-50 overflow-hidden px-2"
    >
      <CardHeader className="pb-0">
        <CardTitle className="flex items-center text-lg truncate">
          <Icon name="airplay" className="h-5 w-5 mr-2" />
          <Link to={href}>{item.name}</Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {item.files.map((file, index) => (
          <div key={index} className="flex items-center space-x-2 mb-1">
            <Icon name="file" className="h-4 w-4" />
            <span className="font-medium text-sm">{file.path}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
