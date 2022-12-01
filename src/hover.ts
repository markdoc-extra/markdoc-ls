import { Hover, HoverParams, MarkupKind } from 'vscode-languageserver'
import { getDataAt, inRange } from './common/parse'
import { Server } from './interfaces'

const empty = {
  contents: '',
}

export function hover(server: Server) {
  return (params: HoverParams): Hover => {
    const data = getDataAt(params.position, server, params.textDocument)
    if (!data) return empty
    const { child, offset } = data
    if (child?.type === 'tag') {
      const attr = child.annotations.find((annotation) =>
        inRange(offset, annotation?.range || [0, 0])
      )
      if (
        attr &&
        `${child.tag}_${attr.name}` in server.completions.attributes
      ) {
        const completion =
          server.completions.attributes[`${child.tag}_${attr.name}`]
        return {
          contents: {
            kind: MarkupKind.Markdown,
            value: [
              '```typescript',
              completion.detail,
              '```',
              completion.documentation.value,
            ].join('\n'),
          },
        }
      }
      if (
        child.tag &&
        child?.tag in server.completions.tags &&
        inRange(offset, child?.range || [0, 0])
      ) {
        const completion = server.completions.tags[child.tag]
        return {
          contents: {
            kind: MarkupKind.Markdown,
            value: [
              '```typescript',
              completion.detail,
              '```',
              completion.documentation.value,
            ].join('\n'),
          },
        }
      }
    }
    return empty
  }
}
