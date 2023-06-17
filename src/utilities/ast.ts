import { Node } from '@markdoc/markdoc/index'

function findInTree(node: Node, line: number): Node | undefined {
  const childNode = node.children.find(
    (child) =>
      line >= child.lines[0] && line <= child.lines[child.lines.length - 1]
  )
  if (childNode?.children) {
    const nodeInChild = findInTree(childNode, line)
    if (
      nodeInChild &&
      (nodeInChild.type === 'tag' || nodeInChild?.type === 'error')
    )
      return nodeInChild
  }
  return childNode
}

function inRange(offset: number, range?: [number, number]): boolean {
  return (range?.length && offset >= range[0] && offset <= range[1]) || false
}

const TAG_OPEN = '{%'

function findTagStart(text: string, offset: number): number {
  return text.substring(0, offset).lastIndexOf(TAG_OPEN)
}

function findTagName(text: string) {
  return text.split(' ')[1].trim() || ''
}

export { findInTree, inRange, findTagStart, findTagName, TAG_OPEN }
