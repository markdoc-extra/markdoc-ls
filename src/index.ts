import {
  createConnection,
  FileChangeType,
  ProposedFeatures,
} from 'vscode-languageserver/node'
import { URI } from 'vscode-uri'
import CompletionsProvider from './providers/completions'
import DiagnosticsProvider from './providers/diagnostics'
import FormattingProvider from './providers/formatting'
import HoverProvider from './providers/hover'
import InitProvider from './providers/init'
import { Documents } from './stores'
import { Server } from './types'

export function startServer() {
  const server: Server = {
    connection: createConnection(ProposedFeatures.all),
    documents: new Documents(),
    capabilities: {},
    ready: false,
  }

  const initProvider = new InitProvider(server)
  const formattingProvider = new FormattingProvider(server)
  const diagnosticsProvider = new DiagnosticsProvider(server)
  const completionProvider = new CompletionsProvider(server)
  const hoverProvider = new HoverProvider(server)

  initProvider.listen()
  formattingProvider.listen()
  diagnosticsProvider.listen()
  completionProvider.listen()
  hoverProvider.listen()

  server.connection.onDidChangeWatchedFiles(({ changes }) => {
    changes.forEach((change) => {
      if (change.type === FileChangeType.Changed) {
        const filePath = URI.parse(change.uri).fsPath
        if (server.schema?.isSchemaPath(filePath)) {
          server.schema.reload(filePath)
        }
      }
    })
  })

  server.documents.listen(server.connection)
  server.connection.listen()
}
