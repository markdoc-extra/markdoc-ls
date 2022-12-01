import { CompletionItem, MarkupKind } from 'vscode-languageserver/node'
import {
  Completion,
  CompletionData,
  CompletionType,
  Server,
} from './interfaces'

export function completionResolve(server: Server) {
  return (item: CompletionItem): CompletionItem => {
    const data = item.data as CompletionData
    let completion: Completion
    if (data.type === CompletionType.function) {
      completion = {
        insertText: `${item.label}()`,
        detail: `${item.label}`,
        documentation: {
          kind: MarkupKind.PlainText,
          value: '',
        },
      }
    } else if (data.type === CompletionType.attribute) {
      completion =
        server.completions.attributes[`${data.tagName}_${item.label}`]
    } else {
      completion = server.completions.tags[item.label]
    }
    return {
      label: item.label,
      kind: item.kind,
      ...completion,
    }
  }
}
