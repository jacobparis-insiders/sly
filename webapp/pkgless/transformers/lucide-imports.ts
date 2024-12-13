import type { Edit } from "@ast-grep/napi"
import { Lang, parse } from "@ast-grep/napi"

export default function transformLucideImports(input: string): string {
  // Parse the input source code
  const ast = parse(Lang.Tsx, input)
  const root = ast.root()

  const edits: Edit[] = []

  // Step 1: Find and replace the `lucide-react` import
  const importPattern = `import { $$$COMPONENTS } from "lucide-react"`
  const importedComponents: string[] = []

  root.findAll(importPattern).forEach((match) => {
    // Extract the imported component names
    const components = match.getMultipleMatches("COMPONENTS")
    if (components) {
      importedComponents.push(...components.map((c) => c.text()))
    }
    // Replace the import statement with the new Icon import
    const edit = match.replace(
      `import { Icon } from "#app/components/icon.tsx";`,
    )
    edits.push(edit)
  })

  // Step 2: Replace JSX elements for the imported components
  importedComponents.forEach((componentName) => {
    root
      .findAll({
        rule: {
          pattern: componentName,
          inside: {
            any: [
              {
                kind: "jsx_opening_element",
              },
              {
                kind: "jsx_self_closing_element",
              },
            ],
          },
        },
      })
      .forEach((jsxMatch) => {
        edits.push(jsxMatch.replace(`Icon name="${renameIcon(componentName)}"`))
      })

    root
      .findAll({
        rule: {
          pattern: componentName,
          inside: {
            kind: "jsx_closing_element",
          },
        },
      })
      .forEach((jsxMatch) => {
        // Handle closing tags separately so we don't add the name attribute
        edits.push(jsxMatch.replace(`Icon`))
      })
  })

  const result = root.commitEdits(edits)
  return result
}

function renameIcon(input: string) {
  // PascalCase to kebab-case
  return input
    .replace(/([a-z])([A-Z])/g, "$1-$2") // Insert '-' between lowercase and uppercase letters
    .replace(/([A-Z])([A-Z][a-z])/g, "$1-$2") // Handle consecutive uppercase letters
    .toLowerCase()
}
