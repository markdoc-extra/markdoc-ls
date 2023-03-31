import { CompletionItemKind, MarkupKind } from 'vscode-languageserver'
import functions from '../../data/functions.json'
import tags from '../../data/tags.json'
import { loadConfig } from './config'
import {
  buildDetailsForAttr,
  buildDetailsForTag,
  buildDocForAttr,
  buildDocForBuiltin,
  buildDocForTag,
  buildInsertTextForAttr,
} from './documentation'
import { Documentation, Server } from './types'

export async function index(server: Server, workspaceRoot: string) {
  const config = await loadConfig(workspaceRoot)
  server.config = config
  console.log('loaded config')
  console.log('caching symbols')

  // populate symbols
  server.symbols.functions = Object.keys(server.config.functions || {})
  server.symbols.tags = Object.keys(server.config.tags || {})

  // populate function docs
  if (server.config.functions) {
    const builtin_funcs: Record<string, Documentation> = functions
    Object.entries(server.config.functions || {}).forEach(([func, _]) => {
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

  if (server.config.tags) {
    const builtin_tags: Record<string, Documentation> = tags
    Object.entries(server.config.tags || {}).forEach(([tag, tagValue]) => {
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
