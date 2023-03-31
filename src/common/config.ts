import { Config } from '@markdoc/markdoc'
import Markdoc from '@markdoc/markdoc/index'
import { existsSync } from 'fs'
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
  if (existsSync(configPath)) {
    const tags = await loadFile(configPath, 'tags')
    const nodes = await loadFile(configPath, 'nodes')
    const functions = await loadFile(configPath, 'functions')
    result = {
      tags: { ...tags, ...Markdoc.tags },
      nodes: { ...nodes, ...Markdoc.nodes },
      functions: { ...functions, ...Markdoc.functions },
    }
  } else {
    result = {
      tags: Markdoc.tags,
      nodes: Markdoc.nodes,
      functions: Markdoc.functions,
    }
  }
  return result
}
