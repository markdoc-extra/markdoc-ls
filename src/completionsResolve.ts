import { CompletionItem } from 'vscode-languageserver/node'
import { CompletionData, CompletionType, Server } from './interfaces'

export function completionResolve(server: Server) {
  return (item: CompletionItem): CompletionItem => {
    const data = item.data as CompletionData
    let completion: CompletionItem
    if (
      data.type === CompletionType.function &&
      item.label in server.completions.functions
    ) {
      completion = server.completions.functions[item.label]
    } else if (data.type === CompletionType.attribute) {
      const lookupKey = `${data.tagName}_${item.label}`
      completion = server.completions.attributes[lookupKey]
    } else {
      completion = server.completions.tags[item.label]
    }
    return completion
  }
}
