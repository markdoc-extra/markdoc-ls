import { readdir, readFile, writeFile } from 'fs/promises'
import { load } from 'js-yaml'
import { join } from 'path'

const DATA_PATH = join(process.cwd(), 'data')

const files = await readdir(DATA_PATH)
for (let file of files) {
  const data = await readFile(join(DATA_PATH, file), 'utf8')
  const parsed = load(data)
  await writeFile(
    join(DATA_PATH, file.replace(/ya?ml/g, 'json')),
    JSON.stringify(parsed)
  )
}
