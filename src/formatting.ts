import { format, parse } from '@markdoc/markdoc/index'
import {
  DocumentFormattingParams,
  Position,
  Range,
  TextEdit,
  uinteger,
} from 'vscode-languageserver/node'
import { Server } from './common/types'

export function formatting(server: Server) {
  return (params: DocumentFormattingParams): TextEdit[] => {
    const currentDoc = server.documents.get(params.textDocument.uri)
    if (!currentDoc) {
      return []
    }
    try {
      const ast = parse(currentDoc.getText())
      const formatted = format(ast)
      if (!formatted) return []
      const docStart = Position.create(0, 0)
      const docEnd = Position.create(currentDoc.lineCount, uinteger.MAX_VALUE)
      const docRange = Range.create(docStart, docEnd)
      return [TextEdit.replace(docRange, formatted)]
    } catch (error) {
      if (error instanceof Error) {
        server.connection.window.showErrorMessage(error.message)
      }
      if (typeof error === 'string') {
        server.connection.window.showErrorMessage(error)
      }
    }
    return []
  }
}
