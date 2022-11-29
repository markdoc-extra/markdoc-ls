import { ValidationError } from '@markdoc/markdoc/index'
import {
  CompletionItem,
  CompletionItemKind,
  TextDocumentPositionParams,
} from 'vscode-languageserver/node'
import { find_tag, getDataAt, inRange } from './common'
import {
  CompletionData,
  CompletionType,
  ErrorType,
  Server,
  Symbols,
} from './interfaces'

function getErrorType(error: ValidationError): ErrorType {
  if (!error.message) {
    return ErrorType.unknown_error
  }
  if (error.message.startsWith('Expected "(" or "="')) {
    return ErrorType.attribute_or_fn_missing
  } else if (error.message.startsWith('Expected "="')) {
    return ErrorType.attribute_missing
  } else if (
    error.message.startsWith(
      'Expected "[", "{", boolean, identifier, null, number, string, or variable'
    )
  ) {
    return ErrorType.value_missing
  } else if (
    error.message.startsWith(
      'Expected "/", class, id, identifier, tag name, or variable'
    )
  ) {
    return ErrorType.tag_missing
  } else {
    return ErrorType.unknown_error
  }
}

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
    const data = getDataAt(params.position, server, params.textDocument)
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
              find_tag(text, offset),
              attributeData
            ),
            ...build_functions(server.symbols, functionData),
          ]
        }
        case ErrorType.attribute_missing: {
          return build_attributes(
            server.symbols,
            find_tag(text, offset),
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
