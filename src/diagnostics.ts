import { Node, parse, validate } from '@mohitsinghs/markdoc'
import { TextDocument } from 'vscode-languageserver-textdocument'
import {
  Diagnostic,
  DiagnosticSeverity,
  Range,
  TextDocumentChangeEvent,
} from 'vscode-languageserver/node'
import { Server } from './interfaces'

const ErrorMap = {
  critical: DiagnosticSeverity.Error,
  error: DiagnosticSeverity.Error,
  warning: DiagnosticSeverity.Warning,
  info: DiagnosticSeverity.Information,
  debug: DiagnosticSeverity.Information,
}

export function diagnostics(server: Server) {
  return (change: TextDocumentChangeEvent<TextDocument>): void => {
    const textDocument = change.document

    const docNode = parse(textDocument.getText())
    const validations = validate(docNode, server.config)
    const diagnostics: Diagnostic[] = []
    validations.forEach((validation) => {
      let range: Range
      if (validation.range) {
        const [rangeStart, rangeEnd] = validation.range
        range = {
          start: textDocument.positionAt(rangeStart),
          end: textDocument.positionAt(rangeEnd),
        }
      } else {
        range = {
          start: {
            line: validation.location?.start.line || 0,
            character: validation.location?.start.character || 0,
          },
          end: {
            line: validation.location?.start.line || 0,
            character: validation.location?.end.character || 0,
          },
        }
      }
      const diagnostic: Diagnostic = {
        severity: ErrorMap[validation.error.level],
        range: range,
        message: validation.error.message,
        code: validation.error.id,
      }
      diagnostics.push(diagnostic)
    })

    server.connection.sendDiagnostics({ uri: textDocument.uri, diagnostics })
  }
}
