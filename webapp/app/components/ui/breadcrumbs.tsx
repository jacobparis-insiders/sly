import { cn } from "#app/utils/misc.js"
import { Icon } from "#app/components/icon.js"
import { Link, useMatches } from "@remix-run/react"
import { z } from "zod"

export const BreadcrumbHandle = z.object({ breadcrumb: z.any() })
export type BreadcrumbHandle = z.infer<typeof BreadcrumbHandle>

const BreadcrumbHandleMatch = z.object({
  handle: BreadcrumbHandle,
  data: z
    .object({
      breadcrumbLabel: z.string().optional(),
    })
    .nullable(),
})

/**
 * Breadcrumbs will check the `export const handle` for all matching nested routes
 * and display them in a trail.
 *
 * To opt in each route, add the `breadcrumb` property to the `handle` object.
 *
 * @example
 * ```ts
 * export const handle: BreadcrumbHandle = {
 *  breadcrumb: 'New',
 * };
 * ```
 *
 * For dynamic data, return `breadcrumbLabel` from the loader. You must still
 * add the `breadcrumb` property to the `handle` object.
 *
 * @example
 * ```ts
 * export async function loader() {
 *   const user = await getUser();
 *   return {
 *     breadcrumbLabel: user.name || user.email || 'User',
 *   };
 * }
 * ```
 */
export function Breadcrumbs({ className }: { className?: string }) {
  const matches = useMatches()
  const breadcrumbs = matches
    .map((m) => {
      const result = BreadcrumbHandleMatch.safeParse(m)
      if (!result.success || !result.data.handle.breadcrumb) return null
      return (
        <Link
          key={m.id}
          to={m.pathname === "/" ? "/dashboard" : m.pathname}
          className="flex items-center hover:underline"
        >
          {result.data.handle.breadcrumb} {result.data.data?.breadcrumbLabel}
        </Link>
      )
    })
    .filter(Boolean)

  return (
    <ul className="flex gap-2 text-lg font-black">
      {breadcrumbs.map((breadcrumb, i, arr) => (
        <li
          key={i}
          className={cn(
            "flex items-center gap-2 text-neutral-500",
            {
              "text-foreground": i === arr.length - 1,
            },
            className,
          )}
        >
          {i !== 0 && <Icon name="chevron-right" className="w-4 h-4" />}
          {breadcrumb}
        </li>
      ))}
    </ul>
  )
}
