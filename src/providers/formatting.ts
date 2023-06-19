import { format, Node, parse } from '@markdoc/markdoc/index'
import {
  DocumentFormattingParams,
  DocumentRangeFormattingParams,
  Range,
  TextEdit,
  uinteger,
} from 'vscode-languageserver/node'
import { Server } from '../types'

export default class FormattingProvider {
  private server: Server

  constructor(server: Server) {
    this.server = server
  }

  listen() {
    this.server.connection.onDocumentFormatting(this.format.bind(this))
    this.server.connection.onDocumentRangeFormatting(
      this.formatRange.bind(this)
    )
  }

  private formatWith(ast: Node, range: Range): TextEdit[] {
    try {
      const formatted = format(ast)
      if (!formatted) return []
      return [TextEdit.replace(range, formatted)]
    } catch (e: any) {
      this.server.connection.window.showErrorMessage(e.message || e)
    }
    return []
  }

  format({ textDocument }: DocumentFormattingParams): TextEdit[] {
    const currentDoc = this.server.documents.get(textDocument.uri)
    if (!currentDoc) return []

    const ast = this.server.documents.getAst(textDocument.uri)
    const range = Range.create(0, 0, currentDoc.lineCount, uinteger.MAX_VALUE)
    return this.formatWith(ast, range)
  }

  formatRange({ textDocument, range }: DocumentRangeFormattingParams) {
    const currentDoc = this.server.documents.get(textDocument.uri)
    if (!currentDoc) return []

    const selectedRange = Range.create(
      range.start.line,
      0,
      range.end.line,
      uinteger.MAX_VALUE
    )
    const ast = parse(currentDoc.getText(selectedRange))
    return this.formatWith(ast, selectedRange)
  }
}
