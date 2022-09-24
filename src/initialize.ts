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

let hasWorkspaceFolderCapability = false

export function initialize(server: Server) {
  return (
    params: InitializeParams,
    _cancel: CancellationToken,
    progress: WorkDoneProgressReporter
  ): InitializeResult => {
    progress.begin('Initializing')
    server.capabilities = params.capabilities
    if (params.workspaceFolders?.length) {
      const workspaceRoot = URI.parse(params.workspaceFolders[0].uri).fsPath
      loadConfig(workspaceRoot)
        .then((cfg) => {
          server.config = cfg
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
        })
        .catch((e) => {
          console.log('failed to load config', e)
        })
    }

    hasWorkspaceFolderCapability = !!(
      server.capabilities.workspace &&
      !!server.capabilities.workspace.workspaceFolders
    )

    const result: InitializeResult = {
      capabilities: {
        textDocumentSync: TextDocumentSyncKind.Incremental,
        completionProvider: {
          resolveProvider: true,
        },
        documentFormattingProvider: true,
      },
    }
    if (hasWorkspaceFolderCapability) {
      result.capabilities.workspace = {
        workspaceFolders: {
          supported: true,
        },
      }
    }
    progress.done()
    return result
  }
}

export function initialized(server: Server) {
  return () => {
    if (hasWorkspaceFolderCapability) {
      server.connection.workspace.onDidChangeWorkspaceFolders((_event) => {
        server.connection.console.log('Workspace folder change event received.')
      })
    }
  }
}
