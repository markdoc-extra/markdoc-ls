import {
  CancellationToken,
  InitializeParams,
  InitializeResult,
  TextDocumentSyncKind,
  WorkDoneProgressReporter,
} from 'vscode-languageserver/node'
import { URI } from 'vscode-uri'
import { loadConfig } from './config'
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
      try {
        const config = await loadConfig(workspaceRoot)
        server.config = config
        console.log('loaded config')
        console.log('caching symbols')
        if (server.config.functions) {
          server.symbols.functions = Object.keys(server.config.functions)
        }
        if (server.config.tags) {
          const tags = server.config.tags
          server.symbols.tags = Object.keys(tags)
          server.symbols.tags.forEach((tag) => {
            const attributes = tags[tag].attributes || {}
            server.symbols.attributes[tag] = Object.keys(attributes)
          })
        }
        console.log(
          `cached : ${server.symbols.functions.length} functions, ${server.symbols.tags.length} tags`
        )
      } catch (err) {
        console.log('failed to load config', err)
      }
      progress.done()
    }
    server.connection.workspace.onDidChangeWorkspaceFolders((_event) => {
      server.connection.console.log('Workspace folder change event received.')
    })
  }
}
