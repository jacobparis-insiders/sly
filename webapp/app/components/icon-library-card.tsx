import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "#app/components/ui/card.tsx"
import { Icon as IconifyIcon } from "@iconify/react"
import { Link } from "@remix-run/react"

export function IconLibraryCard({
  id,
  name,
  total,
  author,
  samples,
}: {
  id: string
  name: string
  total: number
  author: string
  samples: string[]
}) {
  return (
    <Card className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex flex-col">
      <CardHeader className="grow flex-col">
        <CardTitle>
          <Link to={`/icon/${id}`}>{name}</Link>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col mt-auto">
        <p className="text-muted-foreground text-sm mt-4">
          {author} • {total.toLocaleString()} icons
        </p>
        {samples.length > 0 ? (
          <div className="flex gap-4 mt-2">
            {samples.map((sample) => (
              <IconifyIcon
                key={sample}
                icon={`${id}:${sample}`}
                className="text-2xl self-center"
              />
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
