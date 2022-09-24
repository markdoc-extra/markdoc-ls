import { Node, parse, ValidationError } from '@mohitsinghs/markdoc'
import {
  CompletionItem,
  CompletionItemKind,
  TextDocumentPositionParams,
} from 'vscode-languageserver/node'
import { ErrorType, Server, Symbols } from './interfaces'

function inRange(offset: number, range?: [number, number]) {
  return range?.length && offset >= range[0] && offset <= range[1]
}

const TAG_OPEN = '{%'

function getErrorType(error: ValidationError): ErrorType {
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
  tag_name: string
): CompletionItem[] {
  const attributes = symbols.attributes[tag_name]
  if (!attributes?.length || !tag_name) {
    return []
  }
  return attributes.map(
    (attribute): CompletionItem => ({
      label: attribute,
      kind: CompletionItemKind.Field,
    })
  )
}

function build_functions(symbols: Symbols): CompletionItem[] {
  return symbols.functions.map(
    (func): CompletionItem => ({
      label: func,
      kind: CompletionItemKind.Function,
    })
  )
}

function build_tags(symbols: Symbols): CompletionItem[] {
  return symbols.tags.map(
    (tag): CompletionItem => ({
      label: tag,
      kind: CompletionItemKind.Class,
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
    const docNode = parse(text)
    const pos = params.position
    const offset = textDocument.offsetAt(pos)
    const child = findInTree(docNode, pos.line)
    if (child && child.type === 'tag') {
      if (inRange(offset, child.range)) {
        return build_tags(server.symbols)
      }
    } else if (child?.errors) {
      const [error] = child.errors
      const errorType = getErrorType(error)
      if (errorType === ErrorType.attribute_or_fn_missing) {
        const tag_name = find_tag(text, offset)
        return [
          ...build_attributes(server.symbols, tag_name),
          ...build_functions(server.symbols),
        ]
      } else if (errorType === ErrorType.attribute_missing) {
        const tag_name = find_tag(text, offset)
        return build_attributes(server.symbols, tag_name)
      } else if (errorType === ErrorType.tag_missing) {
        return build_tags(server.symbols)
      }
    }
    return []
  }
}
