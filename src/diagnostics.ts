import Md, { Config } from '@mohitsinghs/markdoc'
import { TextDocument } from 'vscode-languageserver-textdocument'
import {
  Connection,
  Diagnostic,
  DiagnosticSeverity,
  Range,
} from 'vscode-languageserver/node'

const ErrorMap = {
  critical: DiagnosticSeverity.Error,
  error: DiagnosticSeverity.Error,
  warning: DiagnosticSeverity.Warning,
  info: DiagnosticSeverity.Information,
  debug: DiagnosticSeverity.Information,
}

export async function validateTextDocument(
  connection: Connection,
  config: Config,
  textDocument: TextDocument
): Promise<void> {
  const text = textDocument.getText()
  const ast = Md.parse(text)
  const validations = Md.validate(ast, config)

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

  connection.sendDiagnostics({ uri: textDocument.uri, diagnostics })
}
