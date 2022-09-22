import { Config } from '@mohitsinghs/markdoc'
import { TextDocument } from 'vscode-languageserver-textdocument'
import {
  createConnection,
  InitializeParams,
  InitializeResult,
  ProposedFeatures,
  TextDocuments,
  TextDocumentSyncKind,
} from 'vscode-languageserver/node'
import { URI } from 'vscode-uri'
import { validateTextDocument } from './src/diagnostics'
import { loadConfig } from './src/config'

export function startServer() {
  const connection = createConnection(ProposedFeatures.all)
  const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument)

  let hasWorkspaceFolderCapability = false
  let config: Config

  connection.onInitialize((params: InitializeParams) => {
    console.log('server initialized')
    const capabilities = params.capabilities
    if (params.workspaceFolders?.length) {
      const workspaceRoot = URI.parse(params.workspaceFolders[0].uri).fsPath
      loadConfig(workspaceRoot)
        .then((cfg) => {
          config = cfg
          console.log('loaded config in memory')
          documents.all().forEach((doc) => {
            validateTextDocument(connection, config, doc)
          })
        })
        .catch((e) => {
          console.log('failed to load config', e)
        })
    }

    hasWorkspaceFolderCapability = !!(
      capabilities.workspace && !!capabilities.workspace.workspaceFolders
    )

    const result: InitializeResult = {
      capabilities: {
        textDocumentSync: TextDocumentSyncKind.Incremental,
        completionProvider: {
          resolveProvider: true,
        },
      },
    }
    if (hasWorkspaceFolderCapability) {
      result.capabilities.workspace = {
        workspaceFolders: {
          supported: true,
        },
      }
    }
    return result
  })

  connection.onInitialized(() => {
    if (hasWorkspaceFolderCapability) {
      connection.workspace.onDidChangeWorkspaceFolders((_event) => {
        connection.console.log('Workspace folder change event received.')
      })
    }
  })

  // When content of a text document changes, revalidate it
  documents.onDidChangeContent((change) => {
    validateTextDocument(connection, config, change.document)
  })

  documents.listen(connection)
  connection.listen()
}
