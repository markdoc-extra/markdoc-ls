import { parse, validate } from '@markdoc/markdoc/index'
import { setInterval } from 'timers/promises'
import { TextDocument } from 'vscode-languageserver-textdocument'
import {
  Diagnostic,
  DiagnosticSeverity,
  Range,
  TextDocumentChangeEvent,
} from 'vscode-languageserver/node'
import { Server } from './common/types'

const ErrorMap = {
  critical: DiagnosticSeverity.Error,
  error: DiagnosticSeverity.Error,
  warning: DiagnosticSeverity.Warning,
  info: DiagnosticSeverity.Information,
  debug: DiagnosticSeverity.Information,
}

export function diagnostics(server: Server) {
  return async (
    change: TextDocumentChangeEvent<TextDocument>
  ): Promise<void> => {
    if (!server.ready) {
      for await (const startTime of setInterval(100, Date.now())) {
        if (server.ready) {
          break
        }
        const now = Date.now()
        if (now - startTime > 5000) {
          console.log('failed to initialize')
          process.exit(1)
        }
      }
    }
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
