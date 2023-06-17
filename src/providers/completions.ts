import {
  CompletionItem,
  CompletionItemKind,
  CompletionParams,
} from 'vscode-languageserver/node'
import { CompletionData, CompletionType, Server } from '../common/types'
import { findTagStart } from '../utilities/ast'
import { drunkParse, MatchType } from '../utilities/drunkParse'

export default class CompletionsProvider {
  private server: Server

  constructor(server: Server) {
    this.server = server
  }

  listen() {
    this.server.connection.onCompletion(this.complete.bind(this))
    this.server.connection.onCompletionResolve(this.completeResolve.bind(this))
  }

  complete({ textDocument, position }: CompletionParams): CompletionItem[] {
    const currentDoc = this.server.documents.get(textDocument.uri)
    if (!currentDoc) return []
    const text = currentDoc.getText()
    const offset = currentDoc.offsetAt(position)
    const startOffset = findTagStart(currentDoc.getText(), offset)
    const textSoFar = text.substring(startOffset, offset)
    const match = drunkParse(textSoFar)

    if (match) {
      switch (match.type) {
        case MatchType.TagName:
          return this.server.symbols.tags.map((tag) => ({
            label: tag,
            kind: CompletionItemKind.Class,
            data: {
              type: CompletionType.tag,
            },
          }))
        case MatchType.AttrOrFn: {
          if (!match.tagName) return []
          const attributes = this.server.symbols.attributes[match.tagName]
          if (!attributes || !attributes.length) return []
          return [
            ...attributes.map((attr) => ({
              label: attr,
              kind: CompletionItemKind.Field,
              data: {
                type: CompletionType.attribute,
                tagName: match.tagName,
              },
            })),
            ...this.server.symbols.functions.map((func) => ({
              label: func,
              kind: CompletionItemKind.Function,
              data: {
                type: CompletionType.function,
              },
            })),
          ]
        }
        case MatchType.AttrName: {
          if (!match.tagName) return []
          const attributes = this.server.symbols.attributes[match.tagName]
          if (!attributes || !attributes.length) return []
          return attributes.map((attr) => ({
            label: attr,
            kind: CompletionItemKind.Field,
            data: {
              type: CompletionType.attribute,
              tagName: match.tagName,
            },
          }))
        }
        case MatchType.Function:
          return this.server.symbols.functions.map((func) => ({
            label: func,
            kind: CompletionItemKind.Function,
            data: {
              type: CompletionType.function,
            },
          }))
        case MatchType.NullBoolFn:
          return [
            ...['null', 'true', 'false'].map((val) => ({
              label: val,
              kind: CompletionItemKind.Keyword,
              data: {
                type: CompletionType.value,
              },
            })),
            ...this.server.symbols.functions.map((func) => ({
              label: func,
              kind: CompletionItemKind.Function,
              data: {
                type: CompletionType.function,
              },
            })),
          ]
      }
    }

    return []
  }

  completeResolve(item: CompletionItem): CompletionItem {
    const data = item.data as CompletionData
    let completion: CompletionItem
    if (
      data.type === CompletionType.function &&
      item.label in this.server.completions.functions
    ) {
      completion = this.server.completions.functions[item.label]
    } else if (data.type === CompletionType.attribute) {
      const lookupKey = `${data.tagName}_${item.label}`
      completion = this.server.completions.attributes[lookupKey]
    } else {
      completion = this.server.completions.tags[item.label]
    }
    return completion
  }
}
