import { MatchResult, MatchType } from '../types'

export class Drunk {
  private text: string
  private position: number

  constructor(text: string) {
    this.text = text
    this.position = 0
  }

  eof(): boolean {
    return this.position === this.text.length - 1
  }

  endsAfter(num: number): boolean {
    return !this.eof() && this.text.length - (this.position + 1) === num
  }

  peek(num = 1): string | undefined {
    if (this.eof()) return
    return this.text[this.position + num]
  }

  expect(char: string | RegExp, after = 1): boolean {
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
      return this.parsePair(this.expect('"') ? '"' : "'")
    }
  }

  parsePair(open: string, close?: string): string | undefined {
    let depth = 1
    let i = 1

    if (!close) close = open

    while (depth > 0 && i < this.text.length) {
      if (this.text[i] === open) {
        depth++
      } else if (this.text[i] === close) {
        depth--
      }
      i++
    }
    if (depth === 0) {
      const content = this.text.slice(this.position, i)
      this.position += i
      return content
    }
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

  parseVariable(): MatchResult | string | undefined {
    const startPos = this.position
    const identifierMatch = this.parseToken(/[$@]([a-zA-Z][-\w]*)/)
    if (!identifierMatch) return

    if (this.eof()) {
      return { type: MatchType.Var, variableName: identifierMatch[1] }
    }

    while (!this.eof() && !this.expect(/\s/)) {
      if (this.expect(/\./)) {
        const tailMatch = this.parseToken(/\.([a-zA-Z][-\w]*)/)
        if (!tailMatch) return
      } else if (this.expect(/\[/)) {
        if (this.eof()) return
        if (this.expect(/[@$]/, 2)) {
          const nestedVariableMatch = this.parseVariable()
          if (!nestedVariableMatch) {
            return
          } else if (typeof nestedVariableMatch === 'string') {
            if (this.expect(']')) {
              this.position++
            } else {
              return
            }
          } else {
            return nestedVariableMatch
          }
        } else if (this.expect(/\d/, 2)) {
          const numberMatch = this.parseToken(/\d+/)
          if (!numberMatch) return
        } else if (this.expect(/["']/, 2)) {
          const stringMatch = this.parseString()
          if (!stringMatch) return
        } else {
          return
        }
      } else {
        return
      }
    }

    return this.text.slice(startPos, this.position)
  }

  parseTag(): MatchResult | undefined {
    // Tag Name Or Function
    const tagStartMatch = this.parseToken(/\{%\s*/)
    if (!tagStartMatch) return

    if (this.eof()) {
      return { type: MatchType.TagNameOrFunc }
    }

    // Interpolation Variables
    if (this.expect(/[$@]/)) {
      if (this.endsAfter(1)) {
        return { type: MatchType.Var }
      }
      const variableMatch = this.parseVariable()
      if (!variableMatch) {
        return
      } else if (typeof variableMatch != 'string') {
        return variableMatch
      }
    }

    // Skip Class or ID
    while (this.expect(/[.#]/) && !this.eof()) {
      const classOrIDMatch = this.parseToken(/[.#][a-zA-Z][-\w]*/)
      if (!classOrIDMatch) return
    }

    // Tag Name Or Function
    const tagNameMatch = this.parseToken(/[a-zA-Z][-\w]*/)
    if (!tagNameMatch) return
    const tagName = tagNameMatch

    if (this.eof()) {
      return { type: MatchType.TagNameOrFunc, tagName }
    }

    // Interpolation
    if (this.peek() === '=') {
      // Attribute Value
      if (this.endsAfter(1)) {
        return { type: MatchType.AttrVal, attributeName: tagName }
      }
      // Variables
      if (this.expect(/[$@]/)) {
        return { type: MatchType.Var, attributeName: tagName }
      }
    }

    // Sequences
    let attributeName: string
    let isFirst = true
    while (!this.eof()) {
      this.consumeWhitespace()

      // Attribute Name Or Value
      if (isFirst) {
        if (this.eof()) {
          return { type: MatchType.AttrNameOrVal, tagName }
        }
        if (this.endsAfter(1) && this.expect(/[$@]/)) {
          return { type: MatchType.Var, attributeName: tagName }
        }
      }

      // Attribute Name Or Function
      const attributeNameMatch = this.parseToken(/[a-zA-Z][-\w]*/)
      if (!attributeNameMatch) return
      attributeName = attributeNameMatch
      const common = { tagName, attributeName }

      if (this.eof()) {
        return {
          type: isFirst ? MatchType.AttrNameOrFunc : MatchType.AttrName,
          ...common,
        }
      }

      // Attribute Value Or Variable
      if (this.peek() === '=') {
        this.position++ // Consume '='
        if (this.eof()) {
          return { type: MatchType.AttrVal, ...common }
        }
        if (this.expect(/[$@]/)) {
          return { type: MatchType.Var, attributeName: tagName }
        }
      }

      if (this.expect(/[{[]/)) {
        // Object Or Array Value [skip]
        const open = this.expect('[') ? '[' : '{'
        const close = open === '[' ? ']' : '}'
        const remaining = this.parsePair(open, close)
        if (!remaining) return
      } else if (this.expect(/[$@]/)) {
        // Variable [skip]
        const variableMatch = this.parseVariable()
        if (!variableMatch) {
          return
        } else if (typeof variableMatch != 'string') {
          return { ...variableMatch, ...common }
        }
      } else if (this.expect(/[a-zA-Z]/)) {
        if (this.expect(/[nft]/)) {
          // Boolean or Null Value [skip]
          const primitiveMatch = this.parseToken(/null|true|false/)
          if (primitiveMatch) continue
        }
        // Functions
        if (this.endsAfter(1)) {
          return { type: MatchType.Func, ...common }
        }
        const functionMatch = this.parseToken(/[a-zA-Z][-\w]*(?=\()/)
        if (!functionMatch) return
        if (this.eof()) return
        const remaining = this.parsePair('(', ')')
        if (!remaining) return
      } else if (this.expect(/[-\d]/)) {
        // Digits
        const numberMatch = this.parseToken(/-?\d+(\.\d+)?/)
        if (!numberMatch) return
      } else if (this.expect(/["']/)) {
        // String
        const remaining = this.parseString()
        if (!remaining) return
      } else {
        // No Match
        return
      }
      isFirst = false
    }
  }
}
