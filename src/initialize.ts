import {
  CancellationToken,
  InitializeParams,
  InitializeResult,
  TextDocumentSyncKind,
  WorkDoneProgressReporter,
} from 'vscode-languageserver/node'
import { URI } from 'vscode-uri'
import { index } from './common/indexing'
import { Server } from './interfaces'

export function initialize(server: Server) {
  return async (
    params: InitializeParams,
    _cancel: CancellationToken,
    progress: WorkDoneProgressReporter
  ): Promise<InitializeResult> => {
    progress.begin('Initializing')
    server.capabilities = params.capabilities

    const result: InitializeResult = {
      capabilities: {
        textDocumentSync: TextDocumentSyncKind.Incremental,
        completionProvider: {
          resolveProvider: true,
        },
        documentFormattingProvider: true,
        hoverProvider: true,
      },
    }
    progress.done()
    return result
  }
}

export function initialized(server: Server) {
  return async () => {
    const progress = await server.connection.window.createWorkDoneProgress()
    const folders =
      (await server.connection.workspace.getWorkspaceFolders()) ?? []

    if (folders.length) {
      progress.begin('Indexing')
      const workspaceRoot = URI.parse(folders[0].uri).fsPath
      index(server, workspaceRoot)
      progress.done()
    }
    server.connection.workspace.onDidChangeWorkspaceFolders((_event) => {
      server.connection.console.log('Workspace folder change event received.')
    })
  }
}
