import { Config } from '@markdoc/markdoc'
import { join } from 'path'
import { mkdirSync, existsSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { build } from 'esbuild-wasm'

const DEFAULT_DIR = 'markdoc'
const TEMP_DIR = join(tmpdir(), 'markdoc-ls')

async function buildFile(cfgRoot: string, name: string) {
  if (!existsSync(TEMP_DIR)) {
    mkdirSync(TEMP_DIR)
  }
  const filePath = join(cfgRoot, `${name}.js`)
  if (!existsSync(filePath)) {
    return {}
  } else {
    rmSync(filePath)
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
