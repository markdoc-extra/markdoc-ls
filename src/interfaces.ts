import { Config } from '@markdoc/markdoc/index'
import { TextDocument } from 'vscode-languageserver-textdocument'
import {
  ClientCapabilities,
  Connection,
  MarkupContent,
  TextDocuments,
} from 'vscode-languageserver/node'

export interface Symbols {
  tags: string[]
  functions: string[]
  attributes: Record<string, string[]>
}

export interface Completion {
  detail: string
  documentation: MarkupContent
  insertText: string
}

export interface Completions {
  tags: Record<string, Completion>
  attributes: Record<string, Completion>
}

export interface Server {
  connection: Connection
  config: Config
  documents: TextDocuments<TextDocument>
  capabilities: ClientCapabilities
  symbols: Symbols
  completions: Completions
  ready: boolean
}

export enum ErrorType {
  value_missing,
  attribute_or_fn_missing,
  attribute_missing,
  tag_missing,
  unknown_error,
}

export interface CompletionData {
  type: CompletionType
  tagName?: string
}

export enum CompletionType {
  function,
  tag,
  attribute,
}
