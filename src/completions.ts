import { Node, parse, ValidationError } from '@mohitsinghs/markdoc'
import {
  CompletionItem,
  CompletionItemKind,
  TextDocumentPositionParams,
} from 'vscode-languageserver/node'
import {
  CompletionData,
  CompletionType,
  ErrorType,
  Server,
  Symbols,
} from './interfaces'

function inRange(offset: number, range?: [number, number]) {
  return range?.length && offset >= range[0] && offset <= range[1]
}

const TAG_OPEN = '{%'

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

function findInTree(node: Node, line: number): Node | undefined {
  const childNode = node.children.find(
    (child) =>
      line >= child.lines[0] && line <= child.lines[child.lines.length - 1]
  )
  if (childNode?.children) {
    const nodeInChild = findInTree(childNode, line)
    if (
      nodeInChild &&
      (nodeInChild.type === 'tag' || nodeInChild?.type === 'error')
    )
      return nodeInChild
  }
  return childNode
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
      data,
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

function find_tag(text: string, offset: number): string {
  const tagOpenOffset = text.substring(0, offset).lastIndexOf(TAG_OPEN)
  const region = text.substring(tagOpenOffset, offset)
  const tag_name = region.split(' ')[1].trim() || ''
  return tag_name
}

export function completions(server: Server) {
  return (params: TextDocumentPositionParams): CompletionItem[] => {
    const textDocument = server.documents.get(params.textDocument.uri)
    if (!textDocument) return []
    const text = textDocument.getText()
    const pos = params.position
    const offset = textDocument.offsetAt(pos)

    let docNode: Node
    try {
      docNode = parse(text)
    } catch (error) {
      console.log('completions: failed to parse ', error)
      return []
    }
    const child = findInTree(docNode, pos.line)

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
          console.log(error)
          return []
      }
    }
    return []
  }
}
