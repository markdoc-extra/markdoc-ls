import { Config, Schema, SchemaAttribute } from '@markdoc/markdoc/index'
import {
  CompletionItem,
  CompletionItemKind,
  InsertTextFormat,
  MarkupContent,
  MarkupKind,
} from 'vscode-languageserver/node'
import { functions, tags } from '../../data/builtin-docs.json'

const NEWLINE = `
`
const EMPTY = ''

export function buildDocForTag(tagValue: Schema): string {
  return 'description' in tagValue
    ? (tagValue as Record<string, any>)?.description + NEWLINE
    : EMPTY
}

export function buildDocForAttr(attrValue: SchemaAttribute): string {
  const formatter = new Intl.ListFormat('en', {
    style: 'long',
    type: 'disjunction',
  })

  return [
    'description' in attrValue
      ? (attrValue as Record<string, any>)?.description + NEWLINE
      : EMPTY,
    Array.isArray(attrValue?.matches)
      ? `Should be ${formatter.format(attrValue?.matches)}`
      : EMPTY,
  ].join('\n')
}

export function buildDetailsForTag(tag: string, tagValue: Schema): string {
  let detail = tag
  if (typeof tagValue.render === 'string') {
    detail += ` : ${tagValue.render}`
  } else if (typeof tagValue.render === 'function') {
    detail += ` : ${(tagValue.render as any)?.name}`
  }
  return detail
}

export function buildDetailsForAttr(attr: string, attrValue: SchemaAttribute) {
  let detail = attr
  if (typeof attrValue.type === 'string') {
    detail += ` : ${attrValue.type}`
  }
  if (typeof attrValue.type == 'function') {
    detail += ` : ${attrValue.type.name}`
  }
  return detail
}

export function buildInsertTextForAttrName(
  attr: string,
  attrValue: SchemaAttribute
) {
  let text = `${attr}`

  switch (attrValue.type) {
    case 'Array':
    case Array:
      text += '=[$0]'
      break
    case Object:
    case 'Object':
      text += '={$0}'
      break
    case String:
    case 'String':
      text += attrValue.default ? `="${attrValue.default}"` : '"$0"'
  }
  return text
}

export function buildContent(completion: CompletionItem): MarkupContent {
  return {
    kind: MarkupKind.Markdown,
    value: [
      '```typescript',
      completion.detail,
      '```',
      '---',
      (completion.documentation as MarkupContent)?.value,
    ].join('\n'),
  }
}

export function getBuiltinFunc(name: string) {
  return (functions as Record<string, any>)[name]
}

export function getBuiltinTag(name: string) {
  return (tags as Record<string, any>)[name]
}

export function getFuncCompletion(func: string): CompletionItem | undefined {
  const builtin = getBuiltinFunc(func)
  return {
    label: func,
    kind: CompletionItemKind.Function,
    insertText: `${func}($0)`,
    insertTextFormat: InsertTextFormat.Snippet,
    documentation: { kind: MarkupKind.Markdown, value: builtin },
  }
}

export function getTagCompletion(
  schema: Config,
  tagName: string
): CompletionItem | undefined {
  const tagValue = (schema?.tags || {})[tagName]
  if (!tagValue) return
  const builtin = getBuiltinTag(tagName)

  return {
    label: tagName,
    kind: CompletionItemKind.Class,
    insertText: tagName,
    detail: buildDetailsForTag(tagName, tagValue),
    documentation: {
      kind: MarkupKind.Markdown,
      value: builtin ? builtin : buildDocForTag(tagValue),
    },
  }
}

export function getAttributeCompletion(
  schema: Config,
  tagName: string,
  attribute: string
): CompletionItem | undefined {
  const attrValue = ((schema.tags || {})[tagName].attributes || {})[attribute]
  if (!attrValue) return

  return {
    label: tagName,
    kind: CompletionItemKind.Field,
    insertText: buildInsertTextForAttrName(attribute, attrValue),
    insertTextFormat: InsertTextFormat.Snippet,
    detail: buildDetailsForAttr(attribute, attrValue),
    documentation: {
      kind: MarkupKind.Markdown,
      value: buildDocForAttr(attrValue),
    },
  }
}
