import { useState, useEffect, useRef } from "react"
import { generateFileGrid } from "./generate-file-grid"

type FileStructureGridProps = {
  paths: string[]
  width?: number
  ignore?: string[]
  highlight?: string[]
}

export function FileStructureGrid({
  paths,
  width,
  ignore = [],
  highlight = [],
}: FileStructureGridProps) {
  const [grid, setGrid] = useState(() =>
    generateFileGrid({ paths, ignore, highlight }),
  )

  const graphWidth = width ?? grid[0]?.length ?? 1
  const graphHeight = grid.length
  const [prevPaths, setPrevPaths] = useState(paths)
  const [prevIgnore, setPrevIgnore] = useState(ignore)
  const [prevHighlight, setPrevHighlight] = useState(highlight)
  if (
    prevPaths !== paths ||
    prevIgnore !== ignore ||
    prevHighlight !== highlight
  ) {
    setPrevPaths(paths)
    setPrevIgnore(ignore)
    setPrevHighlight(highlight)
    setGrid(generateFileGrid({ paths, ignore, highlight }))
  }

  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext("2d")
    if (canvas && context) {
      // Adjust for high-DPI displays
      const dpr = window.devicePixelRatio || 1
      const width = canvas.clientWidth * dpr
      const height = canvas.clientHeight * dpr
      canvas.width = width
      canvas.height = height
      context.scale(dpr, dpr)

      context.clearRect(0, 0, width, height)

      grid.forEach((row, rowIndex) => {
        row.forEach((cell, colIndex) => {
          const x = ((colIndex / graphWidth) * width) / dpr
          const y = ((rowIndex / graphHeight) * height) / dpr
          const cellWidth = width / graphWidth / dpr
          const cellHeight = height / graphHeight / dpr

          if (cell.isOccupied) {
            context.fillStyle = cell.color
            context.fillRect(x, y, cellWidth, cellHeight)
          } else {
            context.clearRect(x, y, cellWidth, cellHeight)
          }
        })
      })
    }
  }, [grid])

  return (
    <canvas
      ref={canvasRef}
      className="w-full"
      style={{
        aspectRatio: `${graphWidth} / ${graphHeight}`,
      }}
    />
  )
}
