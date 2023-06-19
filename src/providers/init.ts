import {
  CancellationToken,
  InitializeParams,
  InitializeResult,
  TextDocumentSyncKind,
  WorkDoneProgressReporter,
} from 'vscode-languageserver/node'
import { URI } from 'vscode-uri'
import { Schema } from '../stores'
import { Server } from '../types'

export default class InitProvider {
  private server: Server

  constructor(server: Server) {
    this.server = server
  }

  listen() {
    this.server.connection.onInitialize(this.initialize.bind(this))
    this.server.connection.onInitialized(this.initialized.bind(this))
  }

  async initialize(
    params: InitializeParams,
    _cancel: CancellationToken,
    progress: WorkDoneProgressReporter
  ): Promise<InitializeResult> {
    this.server.capabilities = params.capabilities

    const result: InitializeResult = {
      capabilities: {
        textDocumentSync: TextDocumentSyncKind.Incremental,
        completionProvider: {
          resolveProvider: true,
        },
        documentFormattingProvider: true,
        documentRangeFormattingProvider: true,
        hoverProvider: true,
      },
    }
    progress.done()
    return result
  }

  async initialized() {
    const progress =
      await this.server.connection.window.createWorkDoneProgress()
    const folders =
      (await this.server.connection.workspace.getWorkspaceFolders()) ?? []

    if (folders.length) {
      progress.begin('Indexing')
      const workspaceRoot = URI.parse(folders[0].uri).fsPath
      this.server.schema = await Schema.from(workspaceRoot).load()
      this.server.ready = true
      progress.done()
    }
    this.server.connection.workspace.onDidChangeWorkspaceFolders((_event) => {
      this.server.connection.console.log(
        'Workspace folder change event received.'
      )
    })
  }
}
