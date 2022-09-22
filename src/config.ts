import { Config } from '@mohitsinghs/markdoc'
import { join } from 'path'
import { mkdirSync, existsSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { build } from 'esbuild-wasm'

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

  return require(join(TEMP_DIR, `${name}.js`))
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
      tags: tags.default || tags,
      nodes: nodes.default || nodes,
      functions: functions.default || functions,
      ...(config.default || config),
    }
  }
  return result
}