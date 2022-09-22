import { Config } from '@mohitsinghs/markdoc'
import { TextDocument } from 'vscode-languageserver-textdocument'
import {
  ClientCapabilities,
  Connection,
  TextDocuments,
} from 'vscode-languageserver/node'

export interface Server {
  connection: Connection
  config: Config
  documents: TextDocuments<TextDocument>
  capabilities: ClientCapabilities
}
