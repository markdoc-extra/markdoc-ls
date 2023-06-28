import {
  CompletionItem,
  CompletionItemKind,
  CompletionParams,
} from 'vscode-languageserver/node'
import { CompletionData, CompletionType, MatchType, Server } from '../types'
import { findTagStart } from '../utilities/ast'
import { Parser } from '../utilities/parser'
import {
  getAttributeCompletion,
  getFuncCompletion,
  getTagCompletion,
} from '../utilities/resolver'

export default class CompletionsProvider {
  private server: Server

  constructor(server: Server) {
    this.server = server
  }

  listen() {
    this.server.connection.onCompletion(this.complete.bind(this))
    this.server.connection.onCompletionResolve(this.completeResolve.bind(this))
  }

  private completeItems(
    property: 'nodes' | 'tags' | 'variables' | 'functions' | 'partials',
    type: CompletionType,
    kind: CompletionItemKind,
    tagName?: string
  ): CompletionItem[] {
    const schema = this.server.schema?.get()
    if (!schema) return []

    let items: string[]
    const data: CompletionData = { type }
    if (tagName && type === CompletionType.attribute) {
      const { attributes } = (schema.tags || {})[tagName]
      if (!attributes) return []
      items = Object.keys(attributes)
      data.tagName = tagName
    } else {
      items = Object.keys(schema[property] || {})
    }
    if (!items?.length) return []

    return items.map((label) => ({
      label: label,
      kind,
      data,
    }))
  }

  private completeNullAndBool(): CompletionItem[] {
    return ['null', 'true', 'false'].map((val) => ({
      label: val,
      kind: CompletionItemKind.Keyword,
      data: { type: CompletionType.value },
    }))
  }

  private completeTags(): CompletionItem[] {
    return this.completeItems(
      'tags',
      CompletionType.tag,
      CompletionItemKind.Class
    )
  }

  private completeFunc(): CompletionItem[] {
    return this.completeItems(
      'functions',
      CompletionType.function,
      CompletionItemKind.Function
    )
  }

  private completeAttr(tagName: string): CompletionItem[] {
    return this.completeItems(
      'tags',
      CompletionType.attribute,
      CompletionItemKind.Field,
      tagName
    )
  }

  private completeVariables(): CompletionItem[] {
    return this.completeItems(
      'variables',
      CompletionType.variable,
      CompletionItemKind.Property
    )
  }

  complete({ textDocument, position }: CompletionParams): CompletionItem[] {
    const currentDoc = this.server.documents.get(textDocument.uri)
    if (!currentDoc) return []
    const text = currentDoc.getText()
    const offset = currentDoc.offsetAt(position)
    const startOffset = findTagStart(currentDoc.getText(), offset)
    const textSoFar = text.substring(startOffset, offset)
    const match = new Parser(textSoFar).parseTag()
    const schema = this.server.schema?.get()
    if (!schema) return []

    if (match) {
      switch (match.type) {
        case MatchType.TagNameOrFunc:
          return [...this.completeTags(), ...this.completeFunc()]
        case MatchType.AttrNameOrFunc:
          return [
            ...(match.tagName ? this.completeAttr(match.tagName) : []),
            ...this.completeFunc(),
          ]
        case MatchType.AttrNameOrVal:
          return [
            ...(match.tagName ? this.completeAttr(match.tagName) : []),
            ...this.completeFunc(),
            ...this.completeNullAndBool(),
          ]
        case MatchType.AttrName:
          if (!match.tagName) return []
          return this.completeAttr(match.tagName)
        case MatchType.Func:
          return this.completeFunc()
        case MatchType.Var:
          return this.completeVariables()
        case MatchType.AttrVal:
          return [...this.completeNullAndBool(), ...this.completeFunc()]
      }
    }
    return []
  }

  completeResolve(item: CompletionItem): CompletionItem {
    const data = item.data as CompletionData
    let completion: CompletionItem | undefined
    const schema = this.server.schema?.get()
    if (!schema) return item

    if (data.type === CompletionType.function) {
      completion = getFuncCompletion(item.label)
    } else if (data.type === CompletionType.attribute) {
      if (!data.tagName) return item
      completion = getAttributeCompletion(schema, data.tagName, item.label)
    } else {
      completion = getTagCompletion(schema, item.label)
    }

    return completion ? completion : item
  }
}
