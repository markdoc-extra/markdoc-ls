import assert from 'node:assert'
import { test } from 'node:test'
import { MatchType, ParseState } from '../types'
import { Drunk } from './drunk'

test('drunk - eof', async (t) => {
  await t.test('should parse end of file', (t) => {
    const drunk = new Drunk('lorem')
    assert.deepStrictEqual(drunk.eof(), false)
    drunk.parseToken('lorem')
    assert.deepStrictEqual(drunk.eof(), true)
  })
})

test('drunk - endsAfter', async (t) => {
  await t.test('should report end', (t) => {
    const drunk = new Drunk('lorem epsum')
    assert.deepStrictEqual(drunk.endsAfter(11), true)
    drunk.parseToken('lorem')
    assert.deepStrictEqual(drunk.endsAfter(6), true)
  })
})

test('drunk - peek', async (t) => {
  await t.test('should peek nth character', (t) => {
    const drunk = new Drunk('lorem epsum')
    assert.deepStrictEqual(drunk.peek(), 'l')
    assert.deepStrictEqual(drunk.peek(6), 'e')
  })
})

test('drunk - expect', async (t) => {
  await t.test('should peek nth character', (t) => {
    const drunk = new Drunk('lorem epsum')
    assert.deepStrictEqual(drunk.expect('l'), true)
    assert.deepStrictEqual(drunk.expect('e', 6), true)
  })
})

test('drunk - consumeWhitespace', async (t) => {
  await t.test('should consume all kinds of whitespace', (t) => {
    const drunk = new Drunk(' \n\t\t')
    drunk.consumeWhitespace()
    assert.deepStrictEqual(drunk.eof(), true)
  })
})

test('drunk - parseString', async (t) => {
  await t.test('should parse a string with double quote', (t) => {
    const drunk = new Drunk(`"lorem epsum \\" \n dolor" sit`)
    const result = drunk.parseString()
    assert.deepStrictEqual(drunk.endsAfter(4), true)
    assert.deepStrictEqual(result, 'lorem epsum \\" \n dolor')
  })

  await t.test('should parse a string with single quote', (t) => {
    const drunk = new Drunk(`'lorem epsum \\' \\" \n dolor' sit`)
    const result = drunk.parseString()
    assert.deepStrictEqual(drunk.endsAfter(4), true)
    assert.deepStrictEqual(result, `lorem epsum \\' \\" \n dolor`)
  })
})

test('drunk - parsePair', async (t) => {
  await t.test('should parse a pair for brackets', (t) => {
    const drunk = new Drunk(
      `{ name: "John", age: 999, meta: { favorites: [10,23,45] }} extra`
    )
    const result = drunk.parsePair('{', '}')
    assert.deepStrictEqual(drunk.endsAfter(6), true)
    assert.deepStrictEqual(
      result,
      '{ name: "John", age: 999, meta: { favorites: [10,23,45] }}'
    )
  })
})

test('drunk - parseToken', async (t) => {
  await t.test('should parse a token', (t) => {
    const drunk = new Drunk(`lorem epsum`)
    const result = drunk.parseToken('lorem')
    assert.deepStrictEqual(drunk.endsAfter(6), true)
    assert.deepStrictEqual(result, 'lorem')
  })
})

test('drunk - parseVariable', async (t) => {
  await t.test('should parse a simple variable', (t) => {
    const drunk = new Drunk(`$lorem`)
    const result = drunk.parseVariable()
    assert.deepStrictEqual(drunk.eof(), true)
    assert.deepStrictEqual(result, [
      ParseState.Completion,
      { type: MatchType.Var },
    ])
  })

  await t.test('should parse a complex variable', (t) => {
    const drunk = new Drunk(`$lorem.epsum[0].dolor[$sit[$amet]]`)
    const result = drunk.parseVariable()
    assert.deepStrictEqual(drunk.eof(), true)
    assert.deepStrictEqual(result, [ParseState.Skip])
  })

  await t.test('should parse an incomplete complex variable', (t) => {
    const drunk = new Drunk(`$lorem.epsum[0].dolor[$sit`)
    const result = drunk.parseVariable()
    assert.deepStrictEqual(drunk.eof(), true)
    assert.deepStrictEqual(result, [
      ParseState.Completion,
      { type: MatchType.Var },
    ])
  })
})

test('drunk - parseValue', async (t) => {
  await t.test('should parse when value is missing', (t) => {
    assert.deepStrictEqual(new Drunk('').parseValue(), [
      ParseState.Completion,
      { type: MatchType.AttrVal },
    ])
  })

  await t.test('should parse when value is an object/array', (t) => {
    assert.deepStrictEqual(
      new Drunk(
        '{ name: "John", age: 999, meta: { favorites: [10,23,45] }}'
      ).parseValue(),
      [ParseState.Skip]
    )

    assert.deepStrictEqual(new Drunk('[10,23,45, [10.5]]').parseValue(), [
      ParseState.Skip,
    ])
  })

  await t.test('should parse when value is a variable', (t) => {
    assert.deepStrictEqual(new Drunk('$').parseValue(), [
      ParseState.Completion,
      { type: MatchType.Var },
    ])

    assert.deepStrictEqual(
      new Drunk('$lorem.epsum[0].dolor[$sit[$amet]]').parseValue(),
      [ParseState.Skip]
    )

    assert.deepStrictEqual(new Drunk('$#').parseValue(), [ParseState.Error])
  })

  await t.test('should parse when value is boolean or null', (t) => {
    assert.deepStrictEqual(new Drunk('true').parseValue(), [ParseState.Skip])
    assert.deepStrictEqual(new Drunk('false').parseValue(), [ParseState.Skip])
    assert.deepStrictEqual(new Drunk('null').parseValue(), [ParseState.Skip])
  })

  await t.test('should parse when value is function', (t) => {
    assert.deepStrictEqual(new Drunk('equals($name, 5)').parseValue(), [
      ParseState.Skip,
    ])
    assert.deepStrictEqual(new Drunk('equals(').parseValue(), [
      ParseState.Error,
    ])
    assert.deepStrictEqual(new Drunk('e').parseValue(), [
      ParseState.Completion,
      { type: MatchType.Func },
    ])
  })

  await t.test('should parse when value is number', (t) => {
    assert.deepStrictEqual(new Drunk('10').parseValue(), [ParseState.Skip])
    assert.deepStrictEqual(new Drunk('10.5').parseValue(), [ParseState.Skip])
    assert.deepStrictEqual(new Drunk('-10.5').parseValue(), [ParseState.Skip])
    assert.deepStrictEqual(new Drunk('10f').parseValue(), [ParseState.Error])
    assert.deepStrictEqual(new Drunk('10 f').parseValue(), [ParseState.Skip])
  })

  await t.test('should parse when value is a string with double quote', (t) => {
    const drunk = new Drunk(`"lorem epsum \\" \n dolor" sit`)
    assert.deepStrictEqual(drunk.parseValue(), [ParseState.Skip])
  })

  await t.test('should parse when value is a string with single quote', (t) => {
    assert.deepStrictEqual(
      new Drunk(`'lorem epsum \\' \\" \n dolor' sit`).parseValue(),
      [ParseState.Skip]
    )
  })
})

test('drunk - parseAttributeKV', async (t) => {
  await t.test('should parse a key value pair', (t) => {
    assert.deepStrictEqual(new Drunk('name="John"').parseAttributeKV(), [
      ParseState.Skip,
    ])
  })

  await t.test('should parse incomplete key', (t) => {
    assert.deepStrictEqual(new Drunk('name').parseAttributeKV(), [
      ParseState.Completion,
      {
        type: MatchType.AttrName,
        attributeName: 'name',
      },
    ])
  })
})

test('drunk - parseAnnotations', async (t) => {
  await t.test('should parse simple annotations', (t) => {
    assert.deepStrictEqual(
      new Drunk('.class #id name="John"').parseAnnotations(),
      [ParseState.Skip]
    )
    assert.deepStrictEqual(
      new Drunk('name="John" .class #id ').parseAnnotations(),
      [ParseState.Skip]
    )
  })
})

test('drunk - parseTag', async (t) => {
  await t.test('should parse tag/func names', (t) => {
    assert.deepStrictEqual(new Drunk('{%').parseTag(), {
      type: MatchType.TagNameOrFunc,
    })

    assert.deepStrictEqual(new Drunk('{% tag').parseTag(), {
      type: MatchType.TagNameOrFunc,
      tagName: 'tag',
    })

    assert.deepStrictEqual(new Drunk('{% tag-name').parseTag(), {
      type: MatchType.TagNameOrFunc,
      tagName: 'tag-name',
    })
  })

  await t.test('should parse simple interpolation variable', (t) => {
    assert.deepStrictEqual(new Drunk('{% $name').parseTag(), {
      type: MatchType.Var,
    })
  })

  await t.test('should parse nested interpolation variable', (t) => {
    assert.deepStrictEqual(new Drunk('{% $name[$user').parseTag(), {
      type: MatchType.Var,
    })
  })

  await t.test('should parse attribute/function name', (t) => {
    assert.deepStrictEqual(new Drunk('{% tagName ').parseTag(), {
      type: MatchType.AttrNameOrVal,
      tagName: 'tagName',
    })

    assert.deepStrictEqual(new Drunk('{% tagName attr').parseTag(), {
      type: MatchType.AttrName,
      tagName: 'tagName',
      attributeName: 'attr',
    })
  })
})
