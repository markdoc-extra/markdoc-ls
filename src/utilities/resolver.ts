import { Config, Schema, SchemaAttribute } from '@markdoc/markdoc/index'
import {
  CompletionItem,
  CompletionItemKind,
  MarkupContent,
  MarkupKind,
} from 'vscode-languageserver/node'
import functions from '../../data/functions.json'
import tags from '../../data/tags.json'
import { Documentation, Example } from '../types'

const REGION_CODE = '```'
const REGION_MARKDOC = '```markdoc'
const NEWLINE = `
`
const EMPTY = ''

function buildExamples(examples: Example[]) {
  return examples
    .map(
      (example, i) => `


  **Example${examples.length > 1 ? ` ${i + 1}` : ''}**
  
  ${REGION_CODE}${example.language}
  ${example.content}
  ${REGION_CODE}
  `
    )
    .join('\n')
}

export function buildDocForBuiltin(doc: Documentation): string {
  return `
${doc.help}

${doc.examples.length ? buildExamples(doc.examples) : ''}
`
}

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

export function buildInsertTextForAttr(
  attr: string,
  attrValue: SchemaAttribute
) {
  let text = `${attr}=`
  switch (attrValue?.type) {
    case String:
      text += `"${attrValue?.default || ''}"`
      break
    case Array:
      text += '[]'
      break
    case Object:
      text += '{}'
      break
    case Boolean:
      text += `${attrValue?.default || 'false'}`
      break
    case Number:
      text += `${attrValue?.default || '0'}`
      break
  }
  return text
}

export function buildContent(completion: CompletionItem): MarkupContent {
  return {
    kind: MarkupKind.Markdown,
    value: [
      REGION_MARKDOC,
      completion.detail,
      REGION_CODE,
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
    insertText: `${func}()`,
    detail: builtin ? builtin.signature : '',
    documentation: {
      kind: MarkupKind.Markdown,
      value: builtin ? buildDocForBuiltin(builtin) : '',
    },
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
      value: builtin ? buildDocForBuiltin(builtin) : buildDocForTag(tagValue),
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
    insertText: buildInsertTextForAttr(attribute, attrValue),
    detail: buildDetailsForAttr(attribute, attrValue),
    documentation: {
      kind: MarkupKind.Markdown,
      value: buildDocForAttr(attrValue),
    },
  }
}
