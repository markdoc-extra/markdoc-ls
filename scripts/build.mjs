import { build } from 'esbuild-wasm'

try {
  const { errors, warnings } = await build({
    entryPoints: ['src/index.ts'],
    bundle: true,
    minify: process.argv[2] === '--minify',
    platform: 'node',
    external: ['esbuild-wasm'],
    outdir: 'dist/',
    format: 'cjs',
    sourcemap: false,
  })
  if (warnings.length) {
    console.warn(...warnings)
  }
  if (errors.length) {
    console.error(...errors)
  }
} catch (error) {
  console.error(error)
  process.exit(1)
}
