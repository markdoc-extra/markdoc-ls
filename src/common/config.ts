import { Config } from '@markdoc/markdoc'
import Markdoc from '@markdoc/markdoc/index'
import { build, Plugin } from 'esbuild-wasm'
import { existsSync } from 'fs'
import { unlink } from 'fs/promises'
import merge from 'lodash.merge'
import { basename, join } from 'path'
import { ConfigKind, ConfigMeta } from './types'

const MD_CONF_DIR = 'markdoc'
const MD_CONF_IN_DIR = ['tags', 'nodes', 'functions', 'config']
const MD_CONF_AT_ROOT = 'markdoc.config'
const MD_CONF_EXTENSIONS = ['cjs', 'cts', 'js', 'mjs', 'ts', 'mts']

const PluginStubUnsupported: Plugin = {
  name: 'stub-unsupported-imports',
  setup(build) {
    build.onResolve({ filter: /.*\.(astro|[jt]sx)$/ }, () => ({
      path: 'data:text/javascript,export default true',
      external: true,
    }))
  },
}

async function loadFile(meta: ConfigMeta) {
  const ts = new Date().getTime()
  const tmpFile = `${ts}-${basename(meta.path).replace(/m?[tj]s$/, 'mjs')}`
  await build({
    absWorkingDir: meta.parent,
    entryPoints: [meta.path],
    outfile: tmpFile,
    platform: 'node',
    format: 'esm',
    jsx: 'transform',
    loader: { '.js': 'jsx' },
    bundle: true,
    sourcemap: false,
    plugins: [PluginStubUnsupported],
  })
  try {
    const cfg = await import(join(meta.parent, tmpFile))
    return cfg?.default || cfg || {}
  } catch (e: any) {
    console.log(`failed to load ${meta.path}`, e)
  } finally {
    await unlink(join(meta.parent, tmpFile))
  }
  return {}
}

function getConfigKind(fileName: string): ConfigKind {
  switch (fileName) {
    case 'nodes':
      return ConfigKind.Nodes
    case 'tags':
      return ConfigKind.Tags
    case 'functions':
      return ConfigKind.Functions
    case 'config':
      return ConfigKind.Config
    case 'markdoc.config':
      return ConfigKind.RootConfig
    default:
      return ConfigKind.Unknown
  }
}

export function getConfigMeta(root: string, file: string): ConfigMeta {
  const result: ConfigMeta = {
    kind: getConfigKind(file),
    path: '',
    parent: root,
  }
  if (file === MD_CONF_AT_ROOT) {
    for (const ext of MD_CONF_EXTENSIONS) {
      const path = join(root, `${file}.${ext}`)
      if (existsSync(path)) {
        result.path = path
        break
      }
    }
  } else {
    for (const ext of MD_CONF_EXTENSIONS) {
      const path = join(root, `${file}.${ext}`)
      const pathWithIndex = join(root, `${file}.${ext}`)
      if (existsSync(path)) {
        result.path = path
        break
      } else if (existsSync(pathWithIndex)) {
        result.path = pathWithIndex
        break
      }
    }
  }
  return result
}

async function getConfigPaths(rootPath: string): Promise<ConfigMeta[]> {
  const cfgDir = join(rootPath, MD_CONF_DIR)
  if (existsSync(cfgDir)) {
    const configFiles = MD_CONF_IN_DIR.map((file) =>
      getConfigMeta(cfgDir, file)
    ).filter((file) => file.path)
    if (configFiles.length) {
      console.log(`Markdoc config (Next) detected at ${cfgDir}\n`)
      return configFiles
    } else {
      console.log(`failed to detect Markdoc config at ${cfgDir}\n`)
    }
  } else {
    const configAtRoot = getConfigMeta(rootPath, MD_CONF_AT_ROOT)
    if (configAtRoot) {
      console.log(`Markdoc config (Astro) detected at ${rootPath}\n`)
      return [configAtRoot]
    } else {
      console.log(`failed to detect Markdoc config at ${rootPath}\n`)
    }
  }
  return []
}

export async function loadConfig(rootPath: string): Promise<Config> {
  let result = {
    tags: Markdoc.tags,
    nodes: Markdoc.nodes,
    functions: Markdoc.functions,
  }
  const configs = await getConfigPaths(rootPath)
  if (configs.length) {
    for (const meta of configs) {
      const config = await loadFile(meta)
      switch (meta.kind) {
        case ConfigKind.Nodes:
          result.nodes = merge(result.nodes, config)
          break
        case ConfigKind.Functions:
          result.functions = merge(result.functions, config)
          break
        case ConfigKind.Tags:
          result.tags = merge(result.tags, config)
          break
        case ConfigKind.Config:
        case ConfigKind.RootConfig:
          result = merge(result, config)
          break
      }
    }
  }
  return result
}
