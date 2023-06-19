import { Hover, HoverParams } from 'vscode-languageserver/node'
import { Server } from '../types'
import { findInTree, inRange } from '../utilities/ast'
import {
  buildContent,
  getAttributeCompletion,
  getFuncCompletion,
  getTagCompletion,
} from '../utilities/resolver'

export default class HoverProvider {
  private server: Server

  constructor(server: Server) {
    this.server = server
  }

  listen() {
    this.server.connection.onHover(this.hover.bind(this))
  }

  hover({ textDocument, position }: HoverParams): Hover {
    const empty = {
      contents: '',
    }

    const currentDoc = this.server.documents.get(textDocument.uri)
    const ast = this.server.documents.getAst(textDocument.uri)
    const node = findInTree(ast, position.line)
    if (!currentDoc || !ast || !node || node.type !== 'tag') return empty
    const offset = currentDoc.offsetAt(position)
    const schema = this.server.schema?.get()
    if (!schema) return empty

    if (inRange(offset, node.range) && node.tag) {
      const tagCompletion = getTagCompletion(schema, node.tag)
      if (!tagCompletion) return empty
      return { contents: buildContent(tagCompletion) }
    } else if (node.annotations.some((a) => inRange(offset, a.range))) {
      const attr = node.annotations.find((a) => inRange(offset, a.range))
      if (!node.tag || !attr) return empty
      const attrCompletion = getAttributeCompletion(schema, node.tag, attr.name)
      if (!attrCompletion) return empty
      return { contents: buildContent(attrCompletion) }
    } else if (node.annotations.some((a) => inRange(offset, a.value?.range))) {
      const annotation = node.annotations.find((a) =>
        inRange(offset, a.value.range)
      )?.value
      const paramRanges: [number, number][] = Object.values(annotation?.ranges)
      const paramRange = paramRanges.find((range) => inRange(offset, range))
      if (!paramRange && annotation?.name) {
        const funcCompletion = getFuncCompletion(annotation.name)
        if (!funcCompletion) return empty
        return { contents: buildContent(funcCompletion) }
      }
    }
    return empty
  }
}
