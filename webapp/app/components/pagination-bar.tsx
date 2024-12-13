import { useSearchParams } from "@remix-run/react"
import { z } from "zod"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "#app/components/ui/pagination.js"

const DEFAULT_TAKE = 12
const DEFAULT_SKIP = 0

export const PaginationSchema = z.object({
  take: z.number().optional().default(DEFAULT_TAKE),
  skip: z.number().optional().default(DEFAULT_SKIP),
})

export function PaginationBar({
  total,
  className,
}: {
  total: number
  className?: string
}) {
  const [searchParams] = useSearchParams()
  const skip = Number(searchParams.get("skip")) || DEFAULT_SKIP
  const take = Number(searchParams.get("take")) || DEFAULT_TAKE

  const totalPages = Math.ceil(total / take)
  const currentPage = Math.floor(skip / take) + 1

  const maxPages = 5
  const halfMaxPages = Math.floor(maxPages / 2)

  const pageNumbers = [] as Array<number>
  if (totalPages <= maxPages) {
    for (let i = 1; i <= totalPages; i++) {
      pageNumbers.push(i)
    }
  } else {
    let startPage = currentPage - halfMaxPages
    let endPage = currentPage + halfMaxPages
    if (startPage < 1) {
      endPage += Math.abs(startPage) + 1
      startPage = 1
    }
    if (endPage > totalPages) {
      startPage -= endPage - totalPages
      endPage = totalPages
    }
    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i)
    }
  }

  const canPrevious = skip > 0
  const canNext = skip + take < total

  return (
    <Pagination className={className}>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            to={search(
              searchParams,
              canPrevious && {
                skip: Math.max(skip - take, 0),
                take,
              },
            )}
          />
        </PaginationItem>

        {pageNumbers.map((pageNumber) => (
          <PaginationItem key={pageNumber}>
            <PaginationLink
              isActive={pageNumber === currentPage}
              to={search(searchParams, {
                skip: (pageNumber - 1) * take,
                take,
              })}
            >
              {pageNumber}
            </PaginationLink>
          </PaginationItem>
        ))}

        <PaginationItem>
          <PaginationNext
            to={search(
              searchParams,
              canNext && {
                skip: skip + take,
                take,
              },
            )}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
}

function search(
  existingParams: URLSearchParams,
  options:
    | Record<string, string | number | undefined>
    | false
    | null
    | undefined,
) {
  const params = new URLSearchParams(existingParams)

  if (options) {
    for (const [key, value] of Object.entries(options)) {
      if (value !== undefined) {
        params.set(key, String(value))
      } else {
        params.delete(key)
      }
    }
  }

  return `?${params.toString()}`
}
