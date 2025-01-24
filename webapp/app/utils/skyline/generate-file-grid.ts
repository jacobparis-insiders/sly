import { hashPath } from "./hash-path"

interface GridCell {
  isOccupied: boolean
  path: string
  color: string
  isDirectory: boolean
}

function organizeDirectory(
  directoryPath: string,
  contents: (string | GridCell[])[],
  ignore: string[],
  highlight: string[],
): GridCell[][] {
  const dimOptions = { saturation: -20, hue: 40, lightness: 40 }
  const result: GridCell[][] = []
  const directoryCells: GridCell[] = directoryPath
    .split("/")
    .map((segment, index, array) => {
      const item = array.slice(0, index + 1).join("/")
      const hasHighlights = highlight.length > 0
      const isDimmed = hasHighlights && !highlight.includes(item)
      return {
        isOccupied: true,
        path: item,
        color: isDimmed ? hashPath(item, dimOptions) : hashPath(item),
        isDirectory: true,
      }
    })

  let files: GridCell[] = []
  let allFilesIgnored = true

  contents.forEach((item) => {
    if (typeof item === "string") {
      const isIgnored = ignore.includes(item)
      const hasHighlights = highlight.length > 0
      const isDimmed = hasHighlights && !highlight.includes(item)

      if (!isIgnored) {
        allFilesIgnored = false
      }

      files.push({
        isOccupied: true,
        path: item,
        color: isIgnored
          ? "gray"
          : isDimmed
            ? hashPath(item, dimOptions)
            : hashPath(item),
        isDirectory: false,
      })
    } else {
      // Process files before moving to subdirectory
      if (files.length > 0) {
        const rows = organizeFiles(directoryCells, files)
        result.push(...rows)
        files = []
      }
      result.push(...item)
    }
  })

  // If all files are ignored, mark the directory as ignored
  if (allFilesIgnored) {
    directoryCells.forEach((cell) => (cell.color = "gray"))
  }

  // Process any remaining files
  if (files.length > 0) {
    const rows = organizeFiles(directoryCells, files)
    result.push(...rows)
  }

  return result
}

function organizeFiles(
  directoryCells: GridCell[],
  files: GridCell[],
): GridCell[][] {
  const rows: GridCell[][] = []
  const totalFiles = files.length
  const sqrtFiles = Math.ceil(Math.sqrt(totalFiles))

  // More exponential approach for calculating itemsPerRow
  const scaleFactor = Math.log(totalFiles + 1) / Math.log(sqrtFiles + 1)
  const itemsPerRow = Math.ceil(sqrtFiles * scaleFactor)

  for (let i = 0; i < totalFiles; i += itemsPerRow) {
    const row = [...directoryCells, ...files.slice(i, i + itemsPerRow)]
    rows.push(row)
  }

  return rows
}

function rotateGrid(grid: GridCell[][]): GridCell[][] {
  if (grid.length === 0) return []

  const maxLength = Math.max(...grid.map((row) => row.length))

  const paddedGrid = grid.map((row) => {
    while (row.length < maxLength) {
      row.push({ isOccupied: false, path: "", color: "", isDirectory: false })
    }
    return row
  })

  const rotatedGrid: GridCell[][] = []
  for (let i = maxLength - 1; i >= 0; i--) {
    const newRow: GridCell[] = []
    for (let j = 0; j < paddedGrid.length; j++) {
      newRow.push(paddedGrid[j][i])
    }
    rotatedGrid.push(newRow)
  }
  return rotatedGrid
}

const createVerticalGridCache: { [key: string]: GridCell[][] } = {}

function createVerticalGrid({
  paths,
  ignore,
  highlight,
}: {
  paths: string[]
  ignore: string[]
  highlight: string[]
}): GridCell[][] {
  const cacheKey =
    JSON.stringify(paths) + JSON.stringify(ignore) + JSON.stringify(highlight)
  if (createVerticalGridCache[cacheKey]) {
    return createVerticalGridCache[cacheKey]
  }

  const grid: GridCell[][] = []
  const directoryContents: { [key: string]: (string | GridCell[])[] } = {}

  // Group files and directories
  paths.forEach((path) => {
    const parts = path.split("/")
    parts.pop()
    const dirPath = parts.join("/")

    if (!directoryContents[dirPath]) {
      directoryContents[dirPath] = []
    }
    directoryContents[dirPath].push(path)

    // Add directories to their parent directories
    while (parts.length > 0) {
      const parentPath = parts.slice(0, -1).join("/")
      const currentPath = parts.join("/")
      if (!directoryContents[parentPath]) {
        directoryContents[parentPath] = []
      }
      if (!directoryContents[parentPath].includes(currentPath)) {
        directoryContents[parentPath].push(currentPath)
      }
      parts.pop()
    }
  })

  // Generate grid
  function processDirectory(dirPath: string): GridCell[][] {
    const contents = directoryContents[dirPath] || []
    const processedContents = contents.map((item) => {
      if (typeof item === "string") {
        if (
          item.startsWith(dirPath) &&
          item !== dirPath &&
          directoryContents[item]
        ) {
          return processDirectory(item)
        }
        return item
      }
      return item
    })
    return organizeDirectory(dirPath, processedContents, ignore, highlight)
  }

  grid.push(...processDirectory(""))

  createVerticalGridCache[cacheKey] = grid
  return grid
}

export function generateFileGrid({
  paths,
  ignore = [],
  highlight = [],
}: {
  paths: string[]
  ignore?: string[]
  highlight?: string[]
}): GridCell[][] {
  const grid = createVerticalGrid({ paths, ignore, highlight })
  return rotateGrid(grid)
}

export function getFileGridWidth({
  paths,
  ignore = [],
  highlight = [],
}: {
  paths: string[]
  ignore?: string[]
  highlight?: string[]
}): number {
  const grid = createVerticalGrid({ paths, ignore, highlight })
  return grid.length
}
