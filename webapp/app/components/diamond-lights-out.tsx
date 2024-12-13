import { useState, useCallback, useEffect, useRef } from "react"

const GRID_SIZE = 35 // Adjust this to change the grid size
const DIAMOND_SIZE = 50 // This should match the size in your SVG

const originLeft = 82
const originTop = 7

interface DiamondProps {
  x: number
  y: number
}

const Diamond: React.FC<DiamondProps> = ({ x, y }) => (
  <div
    className="absolute h-[36px] w-[36px] animate-pulse opacity-100 transition-opacity ease-in-out"
    style={{
      left: `${originLeft + x * (DIAMOND_SIZE / 2) - (y * DIAMOND_SIZE) / 2}px`,
      top: `${originTop + y * (DIAMOND_SIZE / 2) + x * (DIAMOND_SIZE / 2)}px`,
    }}
  >
    <div
      className="h-full w-full rotate-45 border border-gray-100"
      style={{
        backgroundColor: "rgb(250,250,250)",
      }}
    />
  </div>
)

export function DiamondLightsOut() {
  const [activeDiamonds, setActiveDiamonds] = useState<Set<string>>(new Set())
  const ref = useRef<HTMLDivElement>(null)

  const toggleDiamond = useCallback((x: number, y: number) => {
    if (x + y < 0 || x >= GRID_SIZE || y >= GRID_SIZE || y <= -GRID_SIZE) return

    setActiveDiamonds((prevActiveDiamonds) => {
      const newActiveDiamonds = new Set(prevActiveDiamonds)
      const togglePositions = [
        [x, y],
        [x, y - 1],
        [x, y + 1],
        [x - 1, y],
        [x + 1, y],
      ] as const

      togglePositions.forEach(([posX, posY]) => {
        if (
          posX + posY >= 0 &&
          x < GRID_SIZE &&
          y < GRID_SIZE &&
          y >= -GRID_SIZE
        ) {
          const key = `${posX},${posY}`
          if (newActiveDiamonds.has(key)) {
            newActiveDiamonds.delete(key)
          } else {
            newActiveDiamonds.add(key)
          }
        }
      })

      return newActiveDiamonds
    })
  }, [])

  const diamonds = Array.from(activeDiamonds).map((key) => {
    const [xStr, yStr] = key.split(",")
    const x = parseInt(xStr ?? "0", 10)
    const y = parseInt(yStr ?? "0", 10)

    return <Diamond key={key} x={x} y={y} />
  })

  useEffect(() => {
    const abortController = new AbortController()

    document.addEventListener(
      "click",
      (event: MouseEvent) => {
        const frame = ref.current?.getBoundingClientRect()
        if (!frame) return

        const mouseX = event.clientX - frame.left
        const mouseY = event.clientY - frame.top

        if (mouseY > 1000) return

        // rotate clicks 45 degrees
        const yFloat = (mouseY - mouseX + 120) / DIAMOND_SIZE
        const gridY = Math.floor(yFloat)

        // rotate clicks 45 degrees
        const xFloat = (mouseX + mouseY - 100) / DIAMOND_SIZE
        const gridX = Math.floor(xFloat)

        toggleDiamond(gridX, gridY)
      },
      { signal: abortController.signal },
    )

    return () => {
      abortController.abort()
    }
  }, [toggleDiamond])

  return (
    <div
      ref={ref}
      className="absolute -z-20 col-span-full h-screen w-full overflow-hidden"
    >
      {diamonds}
    </div>
  )
}
