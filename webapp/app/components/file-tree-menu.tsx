import React, { useState } from "react"
import { File, Folder, FolderOpen } from "lucide-react"

interface FileTreeMenuProps {
  paths: string[]
  onFileSelect: (path: string) => void
}

interface TreeNodeProps {
  name: string
  children: Record<string, TreeNode>
  isDirectory: boolean
  level: number
  path: string
  onFileSelect: (path: string) => void
}

interface TreeNode {
  name: string
  children: Record<string, TreeNode>
  isDirectory: boolean
}

function parseFileTree(paths: string[]): TreeNode {
  const root: TreeNode = { name: "root", children: {}, isDirectory: true }

  for (const path of paths) {
    const parts = path.split("/").filter(Boolean)
    let currentNode = root

    for (const part of parts) {
      if (!currentNode.children[part]) {
        currentNode.children[part] = {
          name: part,
          children: {},
          isDirectory: true,
        }
      }
      currentNode = currentNode.children[part]
    }
    currentNode.isDirectory = false
  }

  return root
}

const TreeNode: React.FC<TreeNodeProps> = ({
  name,
  children,
  isDirectory,
  level,
  path,
  onFileSelect,
}) => {
  const [isExpanded, setIsExpanded] = useState(true)

  const toggleExpand = () => {
    if (isDirectory) {
      setIsExpanded(!isExpanded)
    } else {
      onFileSelect(path)
    }
  }

  const childNodes = Object.values(children)

  // get
  return (
    <>
      <button
        type="button"
        className={`flex select-none items-center py-1.5 px-2 rounded-sm hover:bg-[#f1f1f1] active:bg-[#eaeaea] truncate`}
        onClick={toggleExpand}
      >
        {isDirectory ? (
          isExpanded ? (
            <FolderOpen className="mr-2 size-4" />
          ) : (
            <Folder className="mr-2 size-4" />
          )
        ) : (
          <File className="mr-2 size-4" />
        )}
        {name}
      </button>
      {isDirectory && isExpanded && (
        <div className="border-l ml-2 my-1">
          {childNodes.map((child) => (
            <TreeNode
              key={child.name}
              name={child.name}
              children={child.children}
              isDirectory={child.isDirectory}
              level={level + 1}
              path={`${path}/${child.name}`}
              onFileSelect={onFileSelect}
            />
          ))}
        </div>
      )}
    </>
  )
}

export const FileTreeMenu: React.FC<FileTreeMenuProps> = ({
  paths,
  onFileSelect,
}) => {
  const tree = parseFileTree(paths)

  return (
    <div className="font-mono text-[13px] p-2">
      {Object.values(tree.children).map((child) => (
        <TreeNode
          key={child.name}
          name={child.name}
          children={child.children}
          isDirectory={child.isDirectory}
          level={0}
          path={child.name}
          onFileSelect={onFileSelect}
        />
      ))}
    </div>
  )
}
