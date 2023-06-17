enum MatchType {
  TagName = 'TagName',
  AttrOrFn = 'AttrOrFn',
  AttrName = 'AttrName',
  Variable = 'Variable',
  NullBoolFn = 'NullBoolFn',
  Function = 'Function',
}

interface MatchResult {
  type: MatchType
  tagName?: string
  attributeName?: string
}

function drunkParse(text: string): MatchResult | undefined {
  const tagStartMatch = /\{%\s*/.exec(text)
  if (!tagStartMatch) return
  text = text.slice(tagStartMatch[0].length)
  if (!text.length) {
    return { type: MatchType.TagName }
  }

  const tagNameMatch = /[a-zA-Z][-\w]*/.exec(text)
  if (!tagNameMatch) return
  const tagName = tagNameMatch[0]
  text = text.slice(tagNameMatch[0].length)
  if (!text.length) {
    return { type: MatchType.TagName, tagName }
  }

  let attributeName: string
  let isFirst = true
  while (text.length) {
    if (!text[0].match(/\s/)) return
    text = text.trimStart()

    if (isFirst && !text.length) {
      return { type: MatchType.AttrOrFn, tagName }
    }

    const attributeNameMatch = /[a-zA-Z][-\w]*/.exec(text)
    if (!attributeNameMatch) return
    text = text.slice(attributeNameMatch[0].length)
    attributeName = attributeNameMatch[0]
    const common = { tagName, attributeName }
    if (!text.length) {
      return {
        type: isFirst ? MatchType.AttrOrFn : MatchType.AttrName,
        ...common,
      }
    }

    if (text[0] === '=') {
      text = text.slice(1)
    }

    if (text[0].match(/[{[]/)) {
      const open = text[0]
      const close = open === '[' ? ']' : '}'
      const remaining = matchNested(text, open, close)
      if (!remaining) return
      text = remaining
    } else if (
      text.startsWith('null') ||
      text.startsWith('true') ||
      text.startsWith('false')
    ) {
      const primitiveMatch = /null|true|false/.exec(text)
      if (!primitiveMatch) return
      text = text.slice(primitiveMatch[0].length)
    } else if (text[0].match(/[$@]/)) {
      if (text.length === 1) {
        return { type: MatchType.Variable, ...common }
      }
      const variableMatch =
        /[$@][a-zA-Z][-\w]*(\.[a-zA-Z][-\w]*)*(\[[^\]]+\])*/.exec(text)
      if (!variableMatch) return
      text = text.slice(variableMatch[0].length)
    } else if (text[0].match(/[a-zA-Z]/)) {
      const maybeNullOrBool = /[nft]/.test(text[0])
      if (text.length === 1) {
        return {
          type: maybeNullOrBool ? MatchType.NullBoolFn : MatchType.Function,
          ...common,
        }
      }
      const functionMatch = /[a-zA-Z][-\w]*(?=\()/.exec(text)
      if (!functionMatch) return
      text = text.slice(functionMatch[0].length)
      if (!text.length) return
      const remaining = matchNested(text, '(', ')')
      if (!remaining) return
      text = remaining
    } else if (text[0].match(/[-\d]/)) {
      const numberMatch = text.match(/^-?\d+(\.\d+)?/)
      if (!numberMatch) return
      text = text.slice(numberMatch[0].length)
    } else if (text.startsWith('"')) {
      const stringMatch = /"([^"]*)"/.exec(text)
      if (!stringMatch) return
      text = text.slice(stringMatch[0].length)
    } else {
      return
    }
    isFirst = false
  }
}

function matchNested(
  text: string,
  open: string,
  close: string
): string | undefined {
  let depth = 1
  let i = 1
  while (depth > 0 && i < text.length) {
    if (text[i] === open) {
      depth++
    } else if (text[i] === close) {
      depth--
    }
    i++
  }
  if (depth === 0) {
    return text.slice(i)
  }
}

export { drunkParse, MatchType }
