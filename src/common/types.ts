import {
  ClientCapabilities,
  CompletionItem,
  Connection,
} from 'vscode-languageserver/node'
import { Documents } from '../stores/documents'
import { Schema } from '../stores/schema'

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
  schema?: Schema
  documents: Documents
  capabilities: ClientCapabilities
  symbols: Symbols
  completions: Completions
  ready: boolean
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
