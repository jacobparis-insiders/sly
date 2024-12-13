import transformLucideImports from "./lucide-imports"
import { describe, test, expect } from "vitest"
import prettier from "prettier"
describe("transformLucideImports", () => {
  test("should handle single component", async () => {
    const result = transformLucideImports(`
import { Circle } from "lucide-react"

export default function App() {
  return (
    <div>
      <Circle />
    </div>
  )
}
    `)

    expect(await prettier.format(result, { parser: "typescript" }))
      .toMatchInlineSnapshot(`
      "import { Icon } from "#app/components/icon.tsx";

      export default function App() {
        return (
          <div>
            <Icon name="circle" />
          </div>
        );
      }
      "
    `)
  })

  test("should handle attributes", async () => {
    const result = transformLucideImports(`
import { Circle } from "lucide-react"

export default function App() {
  return (
    <div>
      <Circle className="w-5 h-5"/>
    </div>
  )
}
    `)

    expect(await prettier.format(result, { parser: "typescript" }))
      .toMatchInlineSnapshot(`
      "import { Icon } from "#app/components/icon.tsx";

      export default function App() {
        return (
          <div>
            <Icon name="circle" className="w-5 h-5" />
          </div>
        );
      }
      "
    `)
  })

  test("should handle multiple components", async () => {
    const result = transformLucideImports(`
import { Circle, Square } from "lucide-react"

export default function App() {
  return (
    <div>
      <Circle />
      <Square />
    </div>
  )
}
    `)

    expect(await prettier.format(result, { parser: "typescript" }))
      .toMatchInlineSnapshot(`
      "import { Icon } from "#app/components/icon.tsx";

      export default function App() {
        return (
          <div>
            <Icon name="circle" />
            <Icon name="square" />
          </div>
        );
      }
      "
    `)
  })

  test("should handle multi-word components", async () => {
    const result = transformLucideImports(`
import { CircleArrowRight } from "lucide-react"

export default function App() {
  return <CircleArrowRight />
}
    `)

    expect(await prettier.format(result, { parser: "typescript" }))
      .toMatchInlineSnapshot(`
      "import { Icon } from "#app/components/icon.tsx";

      export default function App() {
        return <Icon name="circle-arrow-right" />;
      }
      "
    `)
  })

  test("open-close", async () => {
    const result = transformLucideImports(`
import { Circle } from "lucide-react"

export default function App() {
  return (
    <div>
      <Circle className="w-5 h-5">
        Icon
      </Circle>
    </div>
  )
}
          `)

    expect(await prettier.format(result, { parser: "typescript" }))
      .toMatchInlineSnapshot(`
      "import { Icon } from "#app/components/icon.tsx";

      export default function App() {
        return (
          <div>
            <Icon name="circle" className="w-5 h-5">
              Icon
            </Icon>
          </div>
        );
      }
      "
    `)
  })
})
