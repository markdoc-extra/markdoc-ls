import {
  createConnection,
  FileChangeType,
  ProposedFeatures,
} from 'vscode-languageserver/node'
import { URI } from 'vscode-uri'
import { Server } from './src/common/types'
import CompletionsProvider from './src/providers/completions'
import DiagnosticsProvider from './src/providers/diagnostics'
import FormattingProvider from './src/providers/formatting'
import HoverProvider from './src/providers/hover'
import InitProvider from './src/providers/init'
import { Documents } from './src/stores'

export function startServer() {
  const server: Server = {
    connection: createConnection(ProposedFeatures.all),
    documents: new Documents(),
    capabilities: {},
    symbols: {
      tags: [],
      functions: [],
      attributes: {},
    },
    completions: {
      tags: {},
      attributes: {},
      functions: {},
    },
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
