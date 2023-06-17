import { validate, ValidateError } from '@markdoc/markdoc/index'
import { TextDocument } from 'vscode-languageserver-textdocument'
import {
  Diagnostic,
  DiagnosticSeverity,
  Range,
  TextDocumentChangeEvent,
} from 'vscode-languageserver/node'
import { Server } from '../common/types'
import { waitTillReady } from '../utilities/waitTillReady'

export default class DiagnosticsProvider {
  private server: Server
  private readonly levels = {
    critical: DiagnosticSeverity.Error,
    error: DiagnosticSeverity.Error,
    warning: DiagnosticSeverity.Warning,
    info: DiagnosticSeverity.Information,
    debug: DiagnosticSeverity.Information,
  }

  constructor(server: Server) {
    this.server = server
  }

  listen() {
    this.server.documents.onDidChangeContent(this.validateOnChange, this)
  }

  private createDiagnostics(
    validation: ValidateError,
    range: Range
  ): Diagnostic {
    return {
      severity: this.levels[validation.error.level],
      range: range,
      message: validation.error.message,
      code: validation.error.id,
    }
  }

  private getDiagnostics(
    document: TextDocument,
    validations: ValidateError[]
  ): Diagnostic[] {
    const diagnostics: Diagnostic[] = []
    validations.forEach((validation) => {
      let range: Range
      if (validation.range) {
        const [rangeStart, rangeEnd] = validation.range
        const range = Range.create(
          document.positionAt(rangeStart),
          document.positionAt(rangeEnd)
        )
        const diagnostic = this.createDiagnostics(validation, range)
        diagnostics.push(diagnostic)
      } else if (validation.location) {
        const { start, end } = validation.location
        range = Range.create(
          start.line || 0,
          start.character || 0,
          end.line || 0,
          end.character || 0
        )
        const diagnostic = this.createDiagnostics(validation, range)
        diagnostics.push(diagnostic)
      }
    })
    return diagnostics
  }

  async validateOnChange({
    document,
  }: TextDocumentChangeEvent<TextDocument>): Promise<void> {
    await waitTillReady(this.server)
    const docNode = this.server.documents.getAst(document.uri)
    if (!this.server.schema) return

    const validations = validate(docNode, this.server.schema.get())
    const diagnostics: Diagnostic[] = this.getDiagnostics(document, validations)

    this.server.connection.sendDiagnostics({
      uri: document.uri,
      diagnostics,
    })
  }
}
