const { build } = require('esbuild')

;(async function () {
  try {
    const { errors, warnings } = await build({
      entryPoints: ['index.ts'],
      bundle: true,
      minify: process.argv[2] === '--minify',
      platform: 'node',
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
})()
