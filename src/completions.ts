import {
  CompletionItem,
  CompletionItemKind,
  TextDocumentPositionParams,
} from 'vscode-languageserver/node'
import { getErrorType } from './common/errors'
import { findTag, getNode, inRange } from './common/parse'
import {
  CompletionData,
  CompletionType,
  ErrorType,
  Server,
  Symbols,
} from './common/types'

function build_attributes(
  symbols: Symbols,
  tag_name: string,
  data: CompletionData
): CompletionItem[] {
  const attributes = symbols.attributes[tag_name]
  if (!attributes || !attributes?.length) {
    return []
  }
  return attributes.map(
    (attribute): CompletionItem => ({
      label: attribute,
      kind: CompletionItemKind.Field,
      data: {
        ...data,
        tagName: tag_name,
      },
    })
  )
}

function build_functions(
  symbols: Symbols,
  data: CompletionData
): CompletionItem[] {
  return symbols.functions.map(
    (func): CompletionItem => ({
      label: func,
      kind: CompletionItemKind.Function,
      data,
    })
  )
}

function build_tags(symbols: Symbols, data: CompletionData): CompletionItem[] {
  return symbols.tags.map(
    (tag): CompletionItem => ({
      label: tag,
      kind: CompletionItemKind.Class,
      data,
    })
  )
}

export function completions(server: Server) {
  return (params: TextDocumentPositionParams): CompletionItem[] => {
    const data = getNode(params.position, server, params.textDocument)
    if (!data) return []
    const { child, offset, text } = data

    const tagData = { type: CompletionType.tag }
    const attributeData = { type: CompletionType.attribute }
    const functionData = { type: CompletionType.function }

    if (child && child.type === 'tag') {
      if (inRange(offset, child.range)) {
        return build_tags(server.symbols, tagData)
      }
    }

    if (child?.errors.length) {
      const [error] = child.errors
      switch (getErrorType(error)) {
        case ErrorType.tag_missing: {
          return build_tags(server.symbols, tagData)
        }
        case ErrorType.attribute_or_fn_missing: {
          return [
            ...build_attributes(
              server.symbols,
              findTag(text, offset),
              attributeData
            ),
            ...build_functions(server.symbols, functionData),
          ]
        }
        case ErrorType.attribute_missing: {
          return build_attributes(
            server.symbols,
            findTag(text, offset),
            attributeData
          )
        }
        case ErrorType.unknown_error:
          console.log('completions: unknown error ', error)
          return []
      }
    }
    return []
  }
}
