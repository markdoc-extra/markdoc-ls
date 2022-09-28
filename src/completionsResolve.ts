import { CompletionItem } from 'vscode-languageserver/node'
import { CompletionData, Server, CompletionType } from './interfaces'

export function completionResolve(_server: Server) {
  return (item: CompletionItem): CompletionItem => {
    const { type } = item.data as CompletionData
    let insertText = item.label
    if (type === CompletionType.function) {
      insertText += '()'
    } else if (type === CompletionType.attribute) {
      insertText += '='
    }
    return {
      label: item.label,
      kind: item.kind,
      detail: item.label,
      insertText,
    }
  }
}
