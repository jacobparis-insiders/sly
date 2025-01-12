import { useState, useEffect } from "react"
import { generateFileGrid } from "./generate-file-grid"

interface FileStructureGridProps {
  paths: string[]
}

export function FileStructureGrid({ paths }: FileStructureGridProps) {
  const [grid, setGrid] = useState<ReturnType<typeof generateFileGrid>>(() =>
    generateFileGrid(paths),
  )
  const [prevPaths, setPrevPaths] = useState(paths)
  if (prevPaths !== paths) {
    setPrevPaths(paths)
    setGrid(generateFileGrid(paths))
  }

  const calculateSquareSize = (totalCells: number): number => {
    const minSize = 3 // Minimum size in pixels
    const maxSize = 12 // Maximum size in pixels
    const size = Math.max(
      minSize,
      Math.min(maxSize, Math.floor(400 / Math.sqrt(totalCells))),
    )
    return size
  }

  const totalCells = grid.reduce((sum, row) => sum + row.length, 0)
  const squareSize = calculateSquareSize(totalCells)

  const maxColumns = Math.max(...grid.map((row) => row.length))

  return (
    <div className="w-full" inert>
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${maxColumns}, ${squareSize}px)`,
          gridTemplateRows: `repeat(${grid.length}, ${squareSize}px)`,
        }}
      >
        {grid.map((row, rowIndex) =>
          row.map((cell, colIndex) => (
            <div
              key={`${rowIndex}-${colIndex}`}
              className={`cursor-pointer ${cell.isOccupied ? "" : "bg-none"}`}
              style={{
                width: `${squareSize}px`,
                height: `${squareSize}px`,
                gridColumn: colIndex + 1,
                gridRow: rowIndex + 1,
                backgroundColor: cell.isOccupied ? cell.color : "transparent",
              }}
              title={cell.path}
              role="gridcell"
            />
          )),
        )}
      </div>
    </div>
  )
}
