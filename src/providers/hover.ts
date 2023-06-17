import { Hover, HoverParams } from 'vscode-languageserver/node'
import { buildContent } from '../common/documentation'
import { Server } from '../common/types'
import { findInTree, inRange } from '../utilities/ast'

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

    if (
      inRange(offset, node.range) &&
      node.tag &&
      node.tag in this.server.completions.tags
    ) {
      return {
        contents: buildContent(this.server.completions.tags[node.tag]),
      }
    } else if (node.annotations.some((a) => inRange(offset, a.range))) {
      const attr = node.annotations.find((a) => inRange(offset, a.range))
      const lookupKey = `${node.tag}_${attr?.name}`
      if (attr && lookupKey in this.server.completions.attributes) {
        return {
          contents: buildContent(this.server.completions.attributes[lookupKey]),
        }
      }
    } else if (node.annotations.some((a) => inRange(offset, a.value?.range))) {
      const annotation = node.annotations.find((a) =>
        inRange(offset, a.value.range)
      )?.value
      const paramRanges: [number, number][] = Object.values(annotation?.ranges)
      const paramRange = paramRanges.find((range) => inRange(offset, range))

      if (!paramRange && annotation?.name) {
        return {
          contents: buildContent(
            this.server.completions.functions[annotation.name]
          ),
        }
      }
    }
    return empty
  }
}
