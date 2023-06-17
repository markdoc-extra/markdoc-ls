import { build, Plugin } from 'esbuild-wasm'
import { unlink } from 'fs/promises'
import { basename, join } from 'path'

const PluginStubUnsupported: Plugin = {
  name: 'stub-unsupported-imports',
  setup(build) {
    build.onResolve({ filter: /.*\.(astro|[jt]sx)$/ }, () => ({
      path: 'data:text/javascript,export default true',
      external: true,
    }))
  },
}

export async function compile(path: string, parent: string) {
  const ts = new Date().getTime()
  const tmpFile = `${ts}-${basename(path).replace(/m?[tj]s$/, 'mjs')}`
  try {
    await build({
      absWorkingDir: parent,
      entryPoints: [path],
      outfile: tmpFile,
      platform: 'node',
      format: 'esm',
      jsx: 'transform',
      loader: { '.js': 'jsx' },
      bundle: true,
      sourcemap: false,
      plugins: [PluginStubUnsupported],
    })
  } catch (e) {
    console.log(
      `failed to build config. path : ${path}, working dir : ${parent}`,
      e
    )
  }

  try {
    const cfg = await import(join(parent, tmpFile))
    return cfg?.default || cfg || {}
  } catch (e: any) {
    console.log(`failed to load ${path}`, e)
  } finally {
    await unlink(join(parent, tmpFile))
  }
  return {}
}
