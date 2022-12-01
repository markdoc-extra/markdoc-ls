import { Node, parse } from '@markdoc/markdoc/index'
import { Position, TextDocumentIdentifier } from 'vscode-languageserver'
import { Server } from '../interfaces'

export function getDataAt(
  position: Position,
  server: Server,
  doc: TextDocumentIdentifier
): { child: Node | undefined; offset: number; text: string } | undefined {
  const textDocument = server.documents.get(doc.uri)
  if (!textDocument) return
  const text = textDocument.getText()
  const offset = textDocument.offsetAt(position)
  let docNode: Node
  try {
    docNode = parse(text)
  } catch (error) {
    console.log('parser: failed to parse ', error)
    return
  }
  const child = findInTree(docNode, position.line)
  return {
    child,
    offset,
    text,
  }
}

export function findInTree(node: Node, line: number): Node | undefined {
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

export function inRange(offset: number, range?: [number, number]): boolean {
  return (range?.length && offset >= range[0] && offset <= range[1]) || false
}

const TAG_OPEN = '{%'

export function find_tag(text: string, offset: number): string {
  const tagOpenOffset = text.substring(0, offset).lastIndexOf(TAG_OPEN)
  const region = text.substring(tagOpenOffset, offset)
  const tag_name = region.split(' ')[1].trim() || ''
  return tag_name
}
