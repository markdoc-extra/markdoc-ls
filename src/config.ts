import Markdoc, { Config } from '@markdoc/markdoc/index'
import { build } from 'esbuild-wasm'
import { existsSync, mkdirSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const DEFAULT_DIR = 'markdoc'
const TEMP_DIR = join(tmpdir(), 'markdoc-ls')

async function buildFile(cfgRoot: string, name: string) {
  const nameWithExt = `${name}.js`
  const filePath = join(cfgRoot, nameWithExt)
  const tempFilePath = join(TEMP_DIR, nameWithExt)

  // create temp directory if it doesn't exists
  if (!existsSync(TEMP_DIR)) {
    mkdirSync(TEMP_DIR)
  }
  // remove old generated config if exists
  if (existsSync(tempFilePath)) {
    rmSync(tempFilePath)
  }
  // return empty for non-existent configs
  if (!existsSync(filePath)) {
    return {}
  }

  await build({
    entryPoints: [join(cfgRoot, name)],
    bundle: true,
    minify: true,
    platform: 'node',
    loader: {
      '.js': 'jsx',
    },
    outdir: TEMP_DIR,
  })

  const result = await import(join(TEMP_DIR, nameWithExt))
  return result?.default?.default || result?.default || result || {}
}

export async function loadConfig(rootPath: string): Promise<Config> {
  const configPath = join(rootPath, DEFAULT_DIR)
  let result: Config = {}
  const tags = await buildFile(configPath, 'tags')
  const nodes = await buildFile(configPath, 'nodes')
  const functions = await buildFile(configPath, 'functions')
  const config = await buildFile(configPath, 'config')
  if (existsSync(rootPath)) {
    result = {
      tags: { ...tags, ...Markdoc.tags },
      nodes: { ...nodes, ...Markdoc.nodes },
      functions: { ...functions, ...Markdoc.functions },
      ...(config.default || config),
    }
  }
  return result
}
