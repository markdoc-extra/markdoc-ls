import { TextDocument } from 'vscode-languageserver-textdocument'
import {
  createConnection,
  ProposedFeatures,
  TextDocuments,
} from 'vscode-languageserver/node'
import { diagnostics } from './src/diagnostics'
import { formatting } from './src/formatting'
import { initialize, initialized } from './src/initialize'
import { Server } from './src/interfaces'

export function startServer() {
  const server: Server = {
    connection: createConnection(ProposedFeatures.all),
    documents: new TextDocuments(TextDocument),
    config: {},
    capabilities: {},
  }

  const handleInitialize = initialize(server)
  const handleInitialized = initialized(server)
  const handleFormatting = formatting(server)
  const handleDiagnostics = diagnostics(server)

  server.connection.onInitialize(handleInitialize)
  server.connection.onInitialized(handleInitialized)
  server.connection.onDocumentFormatting(handleFormatting)
  server.documents.onDidChangeContent(handleDiagnostics)

  server.documents.listen(server.connection)
  server.connection.listen()
}
