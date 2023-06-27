import { ClientCapabilities, Connection } from 'vscode-languageserver/node'
import { Documents, Schema } from './stores'

export interface Server {
  connection: Connection
  schema?: Schema
  documents: Documents
  capabilities: ClientCapabilities
  ready: boolean
}

export enum SchemaKind {
  RootSchema,
  Schema,
  Nodes,
  Tags,
  Functions,
  Variables,
  Partials,
  Unknown,
}

export interface SchemaMeta {
  kind: SchemaKind
  path: string
  parent: string
}

export interface CompletionData {
  type: CompletionType
  tagName?: string
}

export enum CompletionType {
  function,
  tag,
  attribute,
  value,
  variable,
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

export enum MatchType {
  TagNameOrFunc,
  AttrNameOrVal,
  AttrNameOrFunc,
  AttrName,
  AttrVal,
  Var,
  Func,
}

export interface MatchResult {
  type: MatchType
  tagName?: string
  attributeName?: string
}

export enum ParseState {
  Completion,
  Skip,
  Error,
}
