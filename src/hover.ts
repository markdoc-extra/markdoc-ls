import { Hover, HoverParams } from 'vscode-languageserver/node'
import { buildContent } from './common/documentation'
import { getNode, inRange } from './common/parse'
import { Server } from './common/types'

const empty = {
  contents: '',
}

export function hover(server: Server) {
  return (params: HoverParams): Hover => {
    const data = getNode(params.position, server, params.textDocument)
    if (!data) return empty
    const { child, offset } = data
    if (child?.type !== 'tag') return empty
    if (
      inRange(offset, child.range) &&
      child.tag &&
      child.tag in server.completions.tags
    ) {
      return {
        contents: buildContent(server.completions.tags[child.tag]),
      }
    } else if (child.annotations.some((a) => inRange(offset, a.range))) {
      const attr = child.annotations.find((a) => inRange(offset, a.range))
      const lookupKey = `${child.tag}_${attr?.name}`
      if (attr && lookupKey in server.completions.attributes) {
        return {
          contents: buildContent(server.completions.attributes[lookupKey]),
        }
      }
    } else if (child.annotations.some((a) => inRange(offset, a.value?.range))) {
      const annotation = child.annotations.find((a) =>
        inRange(offset, a.value.range)
      )?.value
      const paramRanges: [number, number][] = Object.values(annotation?.ranges)
      const paramRange = paramRanges.find((range) => inRange(offset, range))

      if (!paramRange && annotation?.name) {
        return {
          contents: buildContent(server.completions.functions[annotation.name]),
        }
      } else {
        console.log('unimplemented! function params')
      }
    } else {
      console.log('unimplemented! unknown location')
    }
    return empty
  }
}
