import { Config } from '@markdoc/markdoc'
import Markdoc from '@markdoc/markdoc/index'
import { stat } from 'fs/promises'
import { join } from 'path'

const DEFAULT_DIR = 'markdoc'

async function loadFile(configPath: string, name: string) {
  try {
    const cfg = await import(join(configPath, `${name}.js`))
    return cfg?.default || cfg || {}
  } catch (e: any) {
    if (e.name === 'SyntaxError') {
      console.log(`failed to load ${name} for markdoc

Please note that esm configs are not supported.
      `)
    } else {
      console.log(`failed to load ${name}`)
    }
  }
  return {}
}

export async function loadConfig(rootPath: string): Promise<Config> {
  const configPath = join(rootPath, DEFAULT_DIR)
  let result = {}
  if ((await stat(configPath))?.isDirectory()) {
    const tags = await loadFile(configPath, 'tags')
    const nodes = await loadFile(configPath, 'nodes')
    const functions = await loadFile(configPath, 'functions')
    result = {
      tags: { ...tags, ...Markdoc.tags },
      nodes: { ...nodes, ...Markdoc.nodes },
      functions: { ...functions, ...Markdoc.functions },
    }
    console.log({ result })
  } else {
    result = {
      tags: Markdoc.tags,
      nodes: Markdoc.nodes,
      functions: Markdoc.functions,
    }
  }
  return result
}
