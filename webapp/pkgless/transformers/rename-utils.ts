export default function transformComponents(input: string) {
  // handle @/lib/utils special case
  input = input.replaceAll("@/lib/utils", "#app/utils/misc.js")
  input = input.replaceAll("@/registry/default/lib/utils", "#app/utils/misc.js")

  // handle registry component imports
  input = input.replaceAll(
    /@\/registry\/default\/([^"\s]+)/g,
    "#app/components/$1.tsx",
  )

  return input
}
