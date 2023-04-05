import { Config } from '@markdoc/markdoc'
import Markdoc from '@markdoc/markdoc/index'
import { existsSync } from 'fs'
import merge from 'lodash.merge'
import { join } from 'path'
import { ConfigMeta, ConfigType, ModuleType } from './types'

const CONFIG_DIR = 'markdoc'
const CONF_FILES = ['tags', 'nodes', 'functions', 'config']
const CONF_ROOT = 'markdoc.config'

async function loadFile(configPath: string, name: string, mod: ModuleType) {
  const ext = extByMod(mod)
  const isIndex = existsSync(join(configPath, name))
  const fileName = isIndex ? join(name, `index.${ext}`) : `${name}.${ext}`

  try {
    const cfg = await import(join(configPath, fileName))
    return cfg?.default || cfg || {}
  } catch (e: any) {
    if (e.name === 'SyntaxError') {
      console.log(`failed to load ${name}

Please note that esm configs are only supported with .mjs extension.
      `)
    } else {
      console.log(`failed to load ${name}`, e)
    }
  }
  return {}
}

export function extByMod(mod: ModuleType): string {
  return mod === ModuleType.CJS ? 'js' : 'mjs'
}

export function existsModule(
  root: string,
  file: string,
  mod: ModuleType
): boolean {
  const ext = extByMod(mod)
  if (file === CONF_ROOT) {
    return existsSync(join(root, `${file}.${ext}`))
  } else {
    return (
      existsSync(join(root, `${file}.${ext}`)) ||
      existsSync(join(root, file, `index.${ext}`))
    )
  }
}

async function detectConfig(rootPath: string): Promise<ConfigMeta> {
  const cfgDir = join(rootPath, CONFIG_DIR)
  if (existsSync(cfgDir)) {
    if (CONF_FILES.some((file) => existsModule(cfgDir, file, ModuleType.CJS))) {
      console.log(`Markdoc config (cjs) detected at ${cfgDir}\n`)
      return {
        config: ConfigType.Dir,
        module: ModuleType.CJS,
      }
    } else if (
      CONF_FILES.some((file) => existsModule(cfgDir, file, ModuleType.ESM))
    ) {
      console.log(`Markdoc config (esm) detected at ${cfgDir}\n`)
      return {
        config: ConfigType.Dir,
        module: ModuleType.ESM,
      }
    } else {
      console.log(`\nfailed to detect Markdoc config at ${cfgDir}\n`)
    }
  }

  if (existsModule(rootPath, CONF_ROOT, ModuleType.CJS)) {
    console.log(`Markdoc config (cjs) detected at ${rootPath}\n`)
    return {
      config: ConfigType.File,
      module: ModuleType.CJS,
    }
  }

  if (existsModule(rootPath, CONF_ROOT, ModuleType.ESM)) {
    console.log(`Markdoc config (esm) detected at ${rootPath}\n`)
    return {
      config: ConfigType.File,
      module: ModuleType.ESM,
    }
  }

  console.log(`failed to detect Markdoc config at ${rootPath}\n`)
  return {
    config: ConfigType.Unknown,
    module: ModuleType.Unknown,
  }
}

export async function loadConfig(rootPath: string): Promise<Config> {
  let result = {
    tags: Markdoc.tags,
    nodes: Markdoc.nodes,
    functions: Markdoc.functions,
  }
  const confMeta = await detectConfig(rootPath)
  if (confMeta.config === ConfigType.Dir) {
    const configPath = join(rootPath, CONFIG_DIR)
    const tags = await loadFile(configPath, 'tags', confMeta.module)
    const nodes = await loadFile(configPath, 'nodes', confMeta.module)
    const functions = await loadFile(configPath, 'functions', confMeta.module)
    const config = await loadFile(configPath, 'config', confMeta.module)
    result = merge(result, { tags, nodes, functions }, config)
  } else if (confMeta.config === ConfigType.File) {
    const config = await loadFile(rootPath, CONF_ROOT, confMeta.module)
    result = merge(result, config)
  } else {
    result = {
      tags: Markdoc.tags,
      nodes: Markdoc.nodes,
      functions: Markdoc.functions,
    }
  }
  return result
}
