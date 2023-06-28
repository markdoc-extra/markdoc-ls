import { MatchResult, MatchType, ParseState } from '../types'

export class Parser {
  private text: string
  private position: number

  constructor(text: string) {
    this.text = text
    this.position = 0
  }

  eof(): boolean {
    return this.position === this.text.length
  }

  endsAfter(num: number): boolean {
    return !this.eof() && this.text.length - this.position === num
  }

  peek(num = 0): string | undefined {
    if (this.eof()) return
    return this.text[this.position + num]
  }

  expect(char: string | RegExp, after = 0): boolean {
    if (typeof char === 'string') {
      return this.peek(after) === char
    } else {
      return char.test(this.peek(after) || '')
    }
  }

  consumeWhitespace() {
    while (this.expect(/\s/)) {
      this.position++
    }
  }

  parseString(): string | undefined {
    if (this.expect(/["']/)) {
      const quoteType = this.expect('"') ? '"' : "'"
      const start = this.position
      this.position++
      let escaped = false
      while (!this.eof()) {
        const char = this.peek()
        const nextChar = this.peek(1)
        if (char === quoteType && !escaped) {
          return this.text.slice(start + 1, this.position++)
        }
        escaped = char === '\\' && !escaped
        this.position++
        if (escaped && nextChar === quoteType) {
          this.position++
          escaped = false
        }
      }
      this.position = start
    }
  }

  parsePair(open: string, close: string): string | undefined {
    let depth = 0
    const start = this.position
    while (!this.eof()) {
      const char = this.peek()!
      if (char === open) {
        depth++
      } else if (char === close) {
        depth--
        if (depth === 0) {
          this.position++
          return this.text.slice(start, this.position)
        }
      }
      this.position++
    }
    this.position = start
  }

  parseToken(value: string | RegExp): string | undefined {
    const remaining = this.text.slice(this.position)
    if (typeof value === 'string') {
      if (remaining.startsWith(value)) {
        this.position += value.length
        return value
      }
    } else {
      const match = remaining.match(value)
      if (match && match.index === 0) {
        const matchedValue = match[0]
        this.position += matchedValue.length
        return matchedValue
      }
    }
  }

  parseVariable(depth = 0): [ParseState, MatchResult?] {
    const identifierMatch = this.parseToken(/[$@]([a-zA-Z][-\w]*)/)
    if (!identifierMatch) return [ParseState.Error]
    if (this.eof()) return [ParseState.Completion, { type: MatchType.Var }]
    while ((!this.eof() && !this.expect(/\s/)) || depth > 0) {
      if (this.expect(/\./)) {
        const tailMatch = this.parseToken(/\.([a-zA-Z][-\w]*)/)
        if (!tailMatch) return [ParseState.Error]
      } else if (this.expect(/\[/)) {
        this.position++
        depth++
        if (this.eof()) return [ParseState.Error]
        if (this.expect(/[@$]/)) {
          const nestedVariableMatch = this.parseVariable(depth)
          if (!nestedVariableMatch) return [ParseState.Error]
          if (nestedVariableMatch[0] !== ParseState.Skip)
            return nestedVariableMatch
          depth = 0
        } else if (this.expect(/\d/)) {
          const numberMatch = this.parseToken(/\d+/)
          if (!numberMatch) return [ParseState.Error]
        } else if (this.expect(/["']/)) {
          const stringMatch = this.parseString()
          if (!stringMatch) return [ParseState.Error]
        } else {
          return [ParseState.Error]
        }
        if (this.expect(']')) {
          this.position++
          depth--
        }
      } else if (this.expect(']')) {
        this.position++
        depth--
      }
    }
    return [ParseState.Skip]
  }

  parseValue({
    tagName,
    attributeName,
  }: {
    tagName?: string
    attributeName?: string
  } = {}): [ParseState, MatchResult?] {
    const common = {
      ...(tagName && { tagName }),
      ...(attributeName && { attributeName }),
    }
    if (this.eof()) {
      return [ParseState.Completion, { type: MatchType.AttrVal, ...common }]
    } else if (this.expect(/[{[]/)) {
      // Object Or Array Value
      const open = this.expect('[') ? '[' : '{'
      const close = open === '[' ? ']' : '}'
      const remaining = this.parsePair(open, close)
      if (!remaining) return [ParseState.Error]
      return [ParseState.Skip]
    } else if (this.expect(/[$@]/)) {
      // Variable
      if (this.endsAfter(1)) {
        return [
          ParseState.Completion,
          { type: MatchType.Var, ...(attributeName && { attributeName }) },
        ]
      }
      const variableMatch = this.parseVariable()
      if (!variableMatch) return [ParseState.Error]
      return variableMatch
    } else if (this.expect(/[a-zA-Z]/)) {
      // Boolean or Null Value [skip]
      if (this.expect(/[nft]/) && this.parseToken(/null|true|false/)) {
        return [ParseState.Skip]
      }
      // Functions
      if (this.endsAfter(1)) {
        return [ParseState.Completion, { type: MatchType.Func, ...common }]
      }
      const functionMatch = this.parseToken(/[a-zA-Z][-\w]*(?=\()/)
      if (!functionMatch || this.eof()) return [ParseState.Error]
      const remaining = this.parsePair('(', ')')
      if (!remaining) return [ParseState.Error]
      return [ParseState.Skip]
    } else if (this.expect(/[-\d]/)) {
      // Digits
      const numberMatch = this.parseToken(/-?\d+(\.\d+)?(?=(\s+|$))/)
      if (!numberMatch) return [ParseState.Error]
      return [ParseState.Skip]
    } else if (this.expect(/["']/)) {
      // String
      const remaining = this.parseString()
      if (!remaining) return [ParseState.Error]
      return [ParseState.Skip]
    }
    return [ParseState.Error]
  }

  parseAttributeKV(tagName?: string): [ParseState, MatchResult?] {
    const attributeNameMatch = this.parseToken(/[a-zA-Z][-\w]*/)
    if (!attributeNameMatch) return [ParseState.Error]
    const attributeName = attributeNameMatch

    if (this.eof()) {
      return [
        ParseState.Completion,
        {
          type: MatchType.AttrName,
          attributeName,
          ...(tagName && { tagName }),
        },
      ]
    }

    if (this.peek() === '=') {
      this.position++
      return this.parseValue({ attributeName, ...(tagName && { tagName }) })
    }

    return [ParseState.Error]
  }

  parseAnnotations(): [ParseState, MatchResult?] {
    while (!this.eof()) {
      this.consumeWhitespace()
      if (this.expect(/[.#]/)) {
        const classOrIDMatch = this.parseToken(/[.#][a-zA-Z][-\w]*/)
        if (!classOrIDMatch) return [ParseState.Error]
      } else {
        return this.parseAttributeKV()
      }
    }
    return [ParseState.Skip]
  }

  parseTag(): MatchResult | undefined {
    // Tag Name Or Function
    const tagStart = this.parseToken(/\{%\s*/)
    if (!tagStart) return
    if (this.eof()) return { type: MatchType.TagNameOrFunc }

    // Tag Name followed of Attributes
    const tagName = this.parseToken(/([a-zA-Z][-\w]*)?(?=(\s+|$))/)
    if (tagName) {
      if (this.eof()) return { type: MatchType.TagNameOrFunc, tagName }
      let isFirst = true
      while (!this.eof()) {
        this.consumeWhitespace()
        // Attribute Name Or Value
        if (isFirst) {
          if (this.eof()) return { type: MatchType.AttrNameOrVal, tagName }
          if (this.endsAfter(1) && this.expect(/[$@]/)) {
            return { type: MatchType.Var, attributeName: tagName }
          }
        }
        isFirst = false
        const [state, result] = this.parseAttributeKV(tagName)
        switch (state) {
          case ParseState.Completion:
            return result
          case ParseState.Error:
            return
          case ParseState.Skip:
            continue
        }
      }
      // Interpolation Variable
    } else if (this.expect(/[$@]/)) {
      if (this.endsAfter(1)) return { type: MatchType.Var }
      const variableMatch = this.parseVariable()
      if (!variableMatch) return
      return variableMatch[1]
      // Interpolation function
    } else if (this.expect('(')) {
      const remaining = this.parsePair('(', ')')
      if (!remaining) return
      // Annotation Attributes
    } else if (this.expect(/[a-zA-Z#.]/)) {
      const [state, result] = this.parseAnnotations()
      switch (state) {
        case ParseState.Completion:
          return result
        case ParseState.Error:
          return
      }
    }
  }
}
