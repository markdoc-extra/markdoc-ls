const { build } = require('esbuild-wasm')

async function bundle() {
  const logger = console
  const isWatchMode = process.argv[2] === '--watch'
  try {
    const { errors, warnings } = await build({
      entryPoints: ['index.ts'],
      bundle: true,
      minify: process.argv[2] === '--minify',
      platform: 'node',
      external: ['esbuild-wasm'],
      outdir: 'dist/',
      format: 'cjs',
      sourcemap: true,
      watch: isWatchMode,
    })
    if (warnings.length) {
      logger.warn(...warnings)
    }
    if (errors.length) {
      logger.error(...errors)
    }

    if (isWatchMode) {
      logger.log('watching...')
    } else {
      process.exit()
    }
  } catch (error) {
    logger.error(error)
    process.exit(1)
  }
}

bundle()
