import { Config } from '@markdoc/markdoc/index'
import { TextDocument } from 'vscode-languageserver-textdocument'
import {
  ClientCapabilities,
  CompletionItem,
  Connection,
  TextDocuments,
} from 'vscode-languageserver/node'

export enum ConfigKind {
  RootConfig,
  Config,
  Nodes,
  Tags,
  Functions,
  Unknown,
}

export interface ConfigMeta {
  kind: ConfigKind
  path: string
  parent: string
}

export interface Symbols {
  tags: string[]
  functions: string[]
  attributes: Record<string, string[]>
}

export interface Completions {
  tags: Record<string, CompletionItem>
  attributes: Record<string, CompletionItem>
  functions: Record<string, CompletionItem>
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

export interface Example {
  language: string
  content: string
}

export interface Documentation {
  signature?: string
  help: string
  examples: Example[]
}
