import { CompletionItem, CompletionItemKind } from 'vscode-languageserver/node'
import { Server } from './interfaces'

export function completionResolve(_server: Server) {
  return (item: CompletionItem): CompletionItem => {
    return {
      label: item.label,
      kind: item.kind,
      detail: item.label,
    }
  }
}
