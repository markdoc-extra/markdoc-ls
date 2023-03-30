import { Schema, SchemaAttribute } from '@markdoc/markdoc/index'
import { MarkupContent, MarkupKind } from 'vscode-languageserver'
import { Completion, Server } from '../interfaces'
import { loadConfig } from './config'

const NEWLINE = `
`
const EMPTY = ''

export async function index(server: Server, workspaceRoot: string) {
  const config = await loadConfig(workspaceRoot)
  server.config = config
  console.log('loaded config')
  console.log('caching symbols')

  if (server.config.functions) {
    server.symbols.functions = Object.keys(server.config.functions)
  }
  if (server.config.tags) {
    const tags = server.config.tags || {}
    server.symbols.tags = Object.keys(tags)
    Object.entries(tags).forEach(([tag, tagValue]) => {
      const attributes = tags[tag].attributes || {}
      server.symbols.attributes[tag] = Object.keys(attributes)
      server.completions.tags[tag] = getCompletionForTag(tag, tagValue)
      Object.entries(attributes).forEach(([attr, attrValue]) => {
        server.completions.attributes[`${tag}_${attr}`] = getCompletionForAttr(
          attr,
          attrValue
        )
      })
    })
  }
  server.ready = true
  console.log(
    `cached : ${server.symbols.functions.length} functions, ${server.symbols.tags.length} tags`
  )
}

function getCompletionForTag(tag: string, tagValue: Schema): Completion {
  const documentation: MarkupContent = {
    kind: MarkupKind.PlainText,
    value:
      'description' in tagValue
        ? (tagValue as Record<string, any>)?.description + NEWLINE
        : EMPTY,
  }

  let detail = tag
  if (typeof tagValue.render === 'string') {
    detail += ` : ${tagValue.render}`
  } else if (typeof tagValue.render === 'function') {
    detail += ` : ${(tagValue.render as any)?.name}`
  }

  return {
    insertText: tag,
    detail,
    documentation,
  }
}

function getCompletionForAttr(
  attr: string,
  attrValue: SchemaAttribute
): Completion {
  const formatter = new Intl.ListFormat('en', {
    style: 'long',
    type: 'disjunction',
  })

  let insertText = `${attr}=`
  let detail = attr
  const documentation: MarkupContent = {
    kind: MarkupKind.PlainText,
    value: [
      'description' in attrValue
        ? (attrValue as Record<string, any>)?.description + NEWLINE
        : EMPTY,
      Array.isArray(attrValue?.matches)
        ? `Should be ${formatter.format(attrValue?.matches)}`
        : EMPTY,
    ].join('\n'),
  }

  switch (attrValue?.type) {
    case String:
      insertText += `"${attrValue?.default || ''}"`
      detail += ' : String'
      break
    case Array:
      insertText += '[]'
      detail += ' : Array'
      break
    case Object:
      insertText += '{}'
      detail += ' : Object'
      break
    case Boolean:
      insertText += `${attrValue?.default || 'false'}`
      detail += ' : Boolean'
      break
    case Number:
      insertText += `${attrValue?.default || '0'}`
      detail += ' : Number'
      break
  }

  return {
    insertText,
    detail,
    documentation,
  }
}
