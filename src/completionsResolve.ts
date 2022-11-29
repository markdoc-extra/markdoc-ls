import { CompletionItem } from 'vscode-languageserver/node'
import { CompletionData, CompletionType, Server } from './interfaces'

const NEWLINE = `
`
const EMPTY = ''

export function completionResolve(server: Server) {
  return (item: CompletionItem): CompletionItem => {
    const data = item.data as CompletionData
    let insertText = item.label
    let detail = ''
    if (data.type === CompletionType.function) {
      insertText += '()'
    } else if (data.type === CompletionType.attribute) {
      insertText += '='
      const tag = (server.config.tags ?? {})[data.tagName || '']
      const attribute: Record<string, any> = (tag?.attributes ?? {})[item.label]
      const formatter = new Intl.ListFormat('en', {
        style: 'long',
        type: 'disjunction',
      })
      detail += `${
        'description' in attribute ? attribute?.description + NEWLINE : EMPTY
      }${
        Array.isArray(attribute?.matches)
          ? `Should be ${formatter.format(attribute?.matches)}`
          : EMPTY
      }`
      switch (attribute?.type) {
        case String:
          insertText += `"${attribute?.default || ''}"`
          break
        case Array:
          insertText += '[]'
          break
        case Object:
          insertText += '{}'
          break
        case Boolean:
          insertText += `${attribute?.default || 'false'}`
          break
        case Number:
          insertText += `${attribute?.default || '0'}`
          break
      }
    } else if (data.type === CompletionType.tag) {
      const tag: Record<string, any> = (server.config.tags ?? {})[
        item.label || ''
      ]
      if ('description' in tag) {
        detail += tag?.['description'] || ''
      }
    }
    return {
      label: item.label,
      kind: item.kind,
      detail: detail ?? item.label,
      insertText,
    }
  }
}
