import {
  InitializeParams,
  InitializeResult,
  TextDocumentSyncKind,
} from 'vscode-languageserver/node'
import { URI } from 'vscode-uri'
import { loadConfig } from './config'
import { Server } from './interfaces'

let hasWorkspaceFolderCapability = false

export function initialize(server: Server) {
  return (params: InitializeParams): InitializeResult => {
    console.log('initialized server')
    server.capabilities = params.capabilities
    if (params.workspaceFolders?.length) {
      const workspaceRoot = URI.parse(params.workspaceFolders[0].uri).fsPath
      loadConfig(workspaceRoot)
        .then((cfg) => {
          server.config = cfg
          console.log('loaded config')
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
