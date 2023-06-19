import Markdoc, { Config, ConfigType } from '@markdoc/markdoc/index'
import { existsSync } from 'fs'
import merge from 'lodash.merge'
import { join } from 'path'
import { SchemaKind, SchemaMeta } from '../types'
import { compile } from '../utilities/compile'

const kindLookup: Record<string, SchemaKind> = {
  nodes: SchemaKind.Nodes,
  tags: SchemaKind.Tags,
  functions: SchemaKind.Functions,
  variables: SchemaKind.Variables,
  partials: SchemaKind.Partials,
  config: SchemaKind.Schema,
  'markdoc.config': SchemaKind.RootSchema,
}

export class Schema {
  private schemaDir = 'markdoc'
  private schemaAtRoot = 'markdoc.config'
  private allowedExtensions = ['cjs', 'cts', 'js', 'mjs', 'ts', 'mts']
  private allowedFiles = [
    'tags',
    'nodes',
    'functions',
    'variables',
    'partials',
    'config',
  ]

  private rootPath: string
  private schema: Config
  private schemaPaths: string[]

  constructor(rootPath: string) {
    this.rootPath = rootPath
    this.schema = {}
    this.schemaPaths = []
  }

  static from(rootPath: string): Schema {
    return new Schema(rootPath)
  }

  private getSchemaKind(fileName: string): SchemaKind {
    return kindLookup[fileName] || SchemaKind.Unknown
  }

  private getSchemaMeta(root: string, file: string): SchemaMeta {
    const result: SchemaMeta = {
      kind: this.getSchemaKind(file),
      path: '',
      parent: root,
    }
    const isRootSchema = file === this.schemaAtRoot
    for (const ext of this.allowedExtensions) {
      const path = join(root, `${file}.${ext}`)
      const pathWithIndex = join(root, file, `index.${ext}`)
      if (existsSync(path)) {
        result.path = path
        break
      }
      if (!isRootSchema && existsSync(pathWithIndex)) {
        result.path = pathWithIndex
        break
      }
    }
    return result
  }

  private async getSchemaPaths(rootPath: string): Promise<SchemaMeta[]> {
    const cfgDir = join(rootPath, this.schemaDir)
    if (existsSync(cfgDir)) {
      const schemaFiles = this.allowedFiles
        .map((file) => this.getSchemaMeta(cfgDir, file))
        .filter((file) => file.path)
      if (schemaFiles.length) {
        this.schemaPaths = schemaFiles.map((file) => file.path)
        console.log(`Markdoc config (Next) detected at ${cfgDir}\n`)
        return schemaFiles
      } else {
        console.log(`failed to detect Markdoc config at ${cfgDir}\n`)
      }
    } else {
      const schemaAtRoot = this.getSchemaMeta(rootPath, this.schemaAtRoot)
      if (schemaAtRoot.path) {
        this.schemaPaths = [schemaAtRoot.path]
        console.log(`Markdoc config (Astro) detected at ${rootPath}\n`)
        return [schemaAtRoot]
      } else {
        console.log(`failed to detect Markdoc config at ${rootPath}\n`)
      }
    }
    return []
  }

  async load(): Promise<Schema> {
    let result: ConfigType = {
      tags: Markdoc.tags,
      nodes: Markdoc.nodes,
      functions: Markdoc.functions,
    }
    const schemas = await this.getSchemaPaths(this.rootPath)
    if (schemas.length) {
      for (const meta of schemas) {
        const schema = await compile(meta.path, meta.parent)
        switch (meta.kind) {
          case SchemaKind.Nodes:
            result.nodes = merge(result.nodes, schema)
            break
          case SchemaKind.Functions:
            result.functions = merge(result.functions, schema)
            break
          case SchemaKind.Tags:
            result.tags = merge(result.tags, schema)
            break
          case SchemaKind.Variables:
            result.variables = schema
            break
          case SchemaKind.Partials:
            result.partials = schema
            break
          case SchemaKind.Schema:
          case SchemaKind.RootSchema:
            result = merge(result, schema)
            break
        }
      }
    }
    this.schema = result
    return this
  }

  isSchemaPath(schemaPath: string): boolean {
    return this.schemaPaths.includes(schemaPath)
  }

  async reload(schemaPath: string) {
    if (this.schemaPaths.includes(schemaPath)) {
      console.log(`Detected change in ${schemaPath}. Reloading config.`)
      await this.load()
      console.log(`Reloaded config`)
    }
  }

  get(): Config {
    return this.schema
  }
}
