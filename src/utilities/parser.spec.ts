import assert from 'node:assert'
import { test } from 'node:test'
import { MatchType, ParseState } from '../types'
import { Parser } from './parser'

test('parser - eof', async (t) => {
  await t.test('should parse end of file', (t) => {
    const parser = new Parser('lorem')
    assert.deepStrictEqual(parser.eof(), false)
    parser.parseToken('lorem')
    assert.deepStrictEqual(parser.eof(), true)
  })
})

test('parser - endsAfter', async (t) => {
  await t.test('should report end', (t) => {
    const parser = new Parser('lorem epsum')
    assert.deepStrictEqual(parser.endsAfter(11), true)
    parser.parseToken('lorem')
    assert.deepStrictEqual(parser.endsAfter(6), true)
  })
})

test('parser - peek', async (t) => {
  await t.test('should peek nth character', (t) => {
    const parser = new Parser('lorem epsum')
    assert.deepStrictEqual(parser.peek(), 'l')
    assert.deepStrictEqual(parser.peek(6), 'e')
  })
})

test('parser - expect', async (t) => {
  await t.test('should peek nth character', (t) => {
    const parser = new Parser('lorem epsum')
    assert.deepStrictEqual(parser.expect('l'), true)
    assert.deepStrictEqual(parser.expect('e', 6), true)
  })
})

test('parser - consumeWhitespace', async (t) => {
  await t.test('should consume all kinds of whitespace', (t) => {
    const parser = new Parser(' \n\t\t')
    parser.consumeWhitespace()
    assert.deepStrictEqual(parser.eof(), true)
  })
})

test('parser - parseString', async (t) => {
  await t.test('should parse a string with double quote', (t) => {
    const parser = new Parser(`"lorem epsum \\" \n dolor" sit`)
    const result = parser.parseString()
    assert.deepStrictEqual(parser.endsAfter(4), true)
    assert.deepStrictEqual(result, 'lorem epsum \\" \n dolor')
  })

  await t.test('should parse a string with single quote', (t) => {
    const parser = new Parser(`'lorem epsum \\' \\" \n dolor' sit`)
    const result = parser.parseString()
    assert.deepStrictEqual(parser.endsAfter(4), true)
    assert.deepStrictEqual(result, `lorem epsum \\' \\" \n dolor`)
  })
})

test('parser - parsePair', async (t) => {
  await t.test('should parse a pair for brackets', (t) => {
    const parser = new Parser(
      `{ name: "John", age: 999, meta: { favorites: [10,23,45] }} extra`
    )
    const result = parser.parsePair('{', '}')
    assert.deepStrictEqual(parser.endsAfter(6), true)
    assert.deepStrictEqual(
      result,
      '{ name: "John", age: 999, meta: { favorites: [10,23,45] }}'
    )
  })
})

test('parser - parseToken', async (t) => {
  await t.test('should parse a token', (t) => {
    const parser = new Parser(`lorem epsum`)
    const result = parser.parseToken('lorem')
    assert.deepStrictEqual(parser.endsAfter(6), true)
    assert.deepStrictEqual(result, 'lorem')
  })
})

test('parser - parseVariable', async (t) => {
  await t.test('should parse a simple variable', (t) => {
    const parser = new Parser(`$lorem`)
    const result = parser.parseVariable()
    assert.deepStrictEqual(parser.eof(), true)
    assert.deepStrictEqual(result, [
      ParseState.Completion,
      { type: MatchType.Var },
    ])
  })

  await t.test('should parse a complex variable', (t) => {
    const parser = new Parser(`$lorem.epsum[0].dolor[$sit[$amet]]`)
    const result = parser.parseVariable()
    assert.deepStrictEqual(parser.eof(), true)
    assert.deepStrictEqual(result, [ParseState.Skip])
  })

  await t.test('should parse an incomplete complex variable', (t) => {
    const parser = new Parser(`$lorem.epsum[0].dolor[$sit`)
    const result = parser.parseVariable()
    assert.deepStrictEqual(parser.eof(), true)
    assert.deepStrictEqual(result, [
      ParseState.Completion,
      { type: MatchType.Var },
    ])
  })
})

test('parser - parseValue', async (t) => {
  await t.test('should parse when value is missing', (t) => {
    assert.deepStrictEqual(new Parser('').parseValue(), [
      ParseState.Completion,
      { type: MatchType.AttrVal },
    ])
  })

  await t.test('should parse when value is an object/array', (t) => {
    assert.deepStrictEqual(
      new Parser(
        '{ name: "John", age: 999, meta: { favorites: [10,23,45] }}'
      ).parseValue(),
      [ParseState.Skip]
    )

    assert.deepStrictEqual(new Parser('[10,23,45, [10.5]]').parseValue(), [
      ParseState.Skip,
    ])
  })

  await t.test('should parse when value is a variable', (t) => {
    assert.deepStrictEqual(new Parser('$').parseValue(), [
      ParseState.Completion,
      { type: MatchType.Var },
    ])

    assert.deepStrictEqual(
      new Parser('$lorem.epsum[0].dolor[$sit[$amet]]').parseValue(),
      [ParseState.Skip]
    )

    assert.deepStrictEqual(new Parser('$#').parseValue(), [ParseState.Error])
  })

  await t.test('should parse when value is boolean or null', (t) => {
    assert.deepStrictEqual(new Parser('true').parseValue(), [ParseState.Skip])
    assert.deepStrictEqual(new Parser('false').parseValue(), [ParseState.Skip])
    assert.deepStrictEqual(new Parser('null').parseValue(), [ParseState.Skip])
  })

  await t.test('should parse when value is function', (t) => {
    assert.deepStrictEqual(new Parser('equals($name, 5)').parseValue(), [
      ParseState.Skip,
    ])
    assert.deepStrictEqual(new Parser('equals(').parseValue(), [
      ParseState.Error,
    ])
    assert.deepStrictEqual(new Parser('e').parseValue(), [
      ParseState.Completion,
      { type: MatchType.Func },
    ])
  })

  await t.test('should parse when value is number', (t) => {
    assert.deepStrictEqual(new Parser('10').parseValue(), [ParseState.Skip])
    assert.deepStrictEqual(new Parser('10.5').parseValue(), [ParseState.Skip])
    assert.deepStrictEqual(new Parser('-10.5').parseValue(), [ParseState.Skip])
    assert.deepStrictEqual(new Parser('10f').parseValue(), [ParseState.Error])
    assert.deepStrictEqual(new Parser('10 f').parseValue(), [ParseState.Skip])
  })

  await t.test('should parse when value is a string with double quote', (t) => {
    const parser = new Parser(`"lorem epsum \\" \n dolor" sit`)
    assert.deepStrictEqual(parser.parseValue(), [ParseState.Skip])
  })

  await t.test('should parse when value is a string with single quote', (t) => {
    assert.deepStrictEqual(
      new Parser(`'lorem epsum \\' \\" \n dolor' sit`).parseValue(),
      [ParseState.Skip]
    )
  })
})

test('parser - parseAttributeKV', async (t) => {
  await t.test('should parse a key value pair', (t) => {
    assert.deepStrictEqual(new Parser('name="John"').parseAttributeKV(), [
      ParseState.Skip,
    ])
  })

  await t.test('should parse incomplete key', (t) => {
    assert.deepStrictEqual(new Parser('name').parseAttributeKV(), [
      ParseState.Completion,
      {
        type: MatchType.AttrName,
        attributeName: 'name',
      },
    ])
  })
})

test('parser - parseAnnotations', async (t) => {
  await t.test('should parse simple annotations', (t) => {
    assert.deepStrictEqual(
      new Parser('.class #id name="John"').parseAnnotations(),
      [ParseState.Skip]
    )
    assert.deepStrictEqual(
      new Parser('name="John" .class #id ').parseAnnotations(),
      [ParseState.Skip]
    )
  })
})

test('parser - parseTag', async (t) => {
  await t.test('should parse tag/func names', (t) => {
    assert.deepStrictEqual(new Parser('{%').parseTag(), {
      type: MatchType.TagNameOrFunc,
    })

    assert.deepStrictEqual(new Parser('{% tag').parseTag(), {
      type: MatchType.TagNameOrFunc,
      tagName: 'tag',
    })

    assert.deepStrictEqual(new Parser('{% tag-name').parseTag(), {
      type: MatchType.TagNameOrFunc,
      tagName: 'tag-name',
    })
  })

  await t.test('should parse simple interpolation variable', (t) => {
    assert.deepStrictEqual(new Parser('{% $name').parseTag(), {
      type: MatchType.Var,
    })
  })

  await t.test('should parse nested interpolation variable', (t) => {
    assert.deepStrictEqual(new Parser('{% $name[$user').parseTag(), {
      type: MatchType.Var,
    })
  })

  await t.test('should parse attribute/function name', (t) => {
    assert.deepStrictEqual(new Parser('{% tagName ').parseTag(), {
      type: MatchType.AttrNameOrVal,
      tagName: 'tagName',
    })

    assert.deepStrictEqual(new Parser('{% tagName attr').parseTag(), {
      type: MatchType.AttrName,
      tagName: 'tagName',
      attributeName: 'attr',
    })
  })
})
