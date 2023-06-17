import { Config, Node } from '@markdoc/markdoc/index'
import { CompletionItemKind, MarkupKind } from 'vscode-languageserver/node'
import functions from '../../data/functions.json'
import tags from '../../data/tags.json'
import {
  buildDetailsForAttr,
  buildDetailsForTag,
  buildDocForAttr,
  buildDocForBuiltin,
  buildDocForTag,
  buildInsertTextForAttr,
} from './documentation'
import { Documentation, Server } from './types'

export enum MSymbolKind {
  Tag,
  Function,
  Variables,
  Attributes,
}

export interface MSymbol {
  kind: MSymbolKind
  value: string
  parent: string
}

export interface MIndex {
  documents: Record<string, Node>
  symbols: Record<string, MSymbol>
}

export async function index(server: Server) {
  console.log('caching symbols')
  const schema = server.schema?.get() as Config

  // populate symbols
  server.symbols.functions = Object.keys(schema.functions || {})
  server.symbols.tags = Object.keys(schema.tags || {})

  // populate function docs
  if (schema.functions) {
    const builtin_funcs: Record<string, Documentation> = functions
    Object.entries(schema.functions || {}).forEach(([func, _]) => {
      const common = {
        label: func,
        kind: CompletionItemKind.Function,
        insertText: `${func}()`,
      }
      if (builtin_funcs[func]) {
        const doc = builtin_funcs[func]
        server.completions.functions[func] = {
          ...common,
          detail: doc.signature,
          documentation: {
            kind: MarkupKind.Markdown,
            value: buildDocForBuiltin(doc),
          },
        }
      } else {
        server.completions.functions[func] = {
          ...common,
          documentation: {
            kind: MarkupKind.Markdown,
            value: 'Fallback',
          },
        }
      }
    })
  }

  if (schema.tags) {
    const builtin_tags: Record<string, Documentation> = tags
    Object.entries(schema.tags || {}).forEach(([tag, tagValue]) => {
      const common = {
        label: tag,
        kind: CompletionItemKind.Class,
        insertText: tag,
        detail: buildDetailsForTag(tag, tagValue),
      }
      if (builtin_tags[tag]) {
        const doc = builtin_tags[tag]
        server.completions.tags[tag] = {
          ...common,
          documentation: {
            kind: MarkupKind.Markdown,
            value: buildDocForBuiltin(doc),
          },
        }
      } else {
        server.completions.tags[tag] = {
          ...common,
          documentation: {
            kind: MarkupKind.Markdown,
            value: buildDocForTag(tagValue),
          },
        }
      }

      if (tagValue.attributes) {
        server.symbols.attributes[tag] = Object.keys(tagValue.attributes)
        Object.entries(tagValue.attributes || {}).forEach(
          ([attr, attrValue]) => {
            server.completions.attributes[`${tag}_${attr}`] = {
              label: tag,
              kind: CompletionItemKind.Field,
              insertText: buildInsertTextForAttr(attr, attrValue),
              detail: buildDetailsForAttr(attr, attrValue),
              documentation: {
                kind: MarkupKind.Markdown,
                value: buildDocForAttr(attrValue),
              },
            }
          }
        )
      }
    })
  }
  server.ready = true
  console.log(
    `cached : ${server.symbols.functions.length} functions, ${server.symbols.tags.length} tags`
  )
}
