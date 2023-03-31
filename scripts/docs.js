const { readdir, readFile, writeFile } = require('fs/promises')
const { load } = require('js-yaml')
const path = require('path')

const DATA_PATH = path.join(process.cwd(), 'data')

;(async function () {
  const files = await readdir(DATA_PATH)
  for (let file of files) {
    const data = await readFile(path.join(DATA_PATH, file), 'utf8')
    const parsed = load(data)
    await writeFile(
      path.join(DATA_PATH, file.replace(/ya?ml/g, 'json')),
      JSON.stringify(parsed)
    )
  }
})()
