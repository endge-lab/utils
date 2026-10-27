import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { build } from 'vite'

async function main() {
  // Проверяет готовый public export после build в отдельных чистых процессах.
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
  const manifest = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'))
  const entrypoint = path.resolve(root, manifest.exports['.'].import)
  await readFile(entrypoint)
  const fixtures = {
    helpers: `import { EventBus, createInstance, randomString } from '@endge/utils'
      const bus = new EventBus(['item'])
      let calls = 0
      bus.on('item', value => { calls += value })
      bus.emit('item', 7)
      bus.offAll()
      const value = createInstance((a, b) => a + b, 2, 3)
      if (calls !== 7 || value !== 5 || randomString(5).length !== 5 || bus.eventNames().length) throw new Error('helpers')
      export const result = { calls, value }`,
    serialization: `import { Serialize, onDeserialized } from '@endge/utils'
      class Record { calls = 0; after() { this.calls++ } }
      onDeserialized()(Record.prototype, 'after', Object.getOwnPropertyDescriptor(Record.prototype, 'after'))
      const value = Serialize.fromJSON(Record, {})
      if (value.calls !== 1 || typeof Reflect.defineMetadata !== 'function' || typeof Reflect.getMetadata !== 'function') throw new Error('metadata order')
      export const result = { calls: value.calls }`,
    decorators: `import { GenericExpose, Serialize, onDeserialized } from '@endge/utils'
      class Record { value = 'default'; calls = 0; after() { this.calls++ } }
      GenericExpose({ name: 'id' })(Record.prototype, 'value')
      onDeserialized()(Record.prototype, 'after', Object.getOwnPropertyDescriptor(Record.prototype, 'after'))
      const value = Serialize.fromJSON(Record, { id: 'real', ignored: true })
      const plain = Serialize.toPlain(value)
      if (value.value !== 'real' || value.calls !== 1 || Reflect.getMetadata('genericExpose', Record.prototype, 'value') !== 'id' || plain.id !== 'real' || 'ignored' in plain) throw new Error('roundtrip')
      export const result = { calls: value.calls, value: value.value, plain }`,
  }
  const directory = await mkdtemp(path.join(os.tmpdir(), 'utils-public-bundles-'))
  const results = []
  try {
    for (const [name, fixture] of Object.entries(fixtures)) {
      const entry = path.join(directory, `${name}.mjs`)
      await writeFile(entry, fixture)
      const outputs = await build({
        configFile: false,
        root: directory,
        logLevel: 'warn',
        plugins: [{
          name: 'utils-public-export',
          enforce: 'pre',
          async resolveId(id) {
            return id === manifest.name ? this.resolve(entrypoint, entry, { skipSelf: true }) : null
          },
        }],
        build: {
          write: false,
          target: 'es2022',
          minify: 'esbuild',
          sourcemap: false,
          lib: { entry, formats: ['es'] },
          rollupOptions: { output: { inlineDynamicImports: true } },
        },
      })
      const bundles = Array.isArray(outputs) ? outputs : [outputs]
      assert.equal(bundles.length, 1)
      assert.equal(bundles[0].output.length, 1)
      const chunk = bundles[0].output[0]
      assert.equal(chunk.type, 'chunk')
      const bundle = path.join(directory, `${name}.bundle.mjs`)
      await writeFile(bundle, chunk.code)
      const run = spawnSync(process.execPath, ['--input-type=module', '-e', `if (typeof Reflect.defineMetadata !== 'undefined') throw new Error('unclean realm'); const module = await import(${JSON.stringify(pathToFileURL(bundle).href)}); process.stdout.write(JSON.stringify(module.result));`], { encoding: 'utf8', timeout: 10000 })
      assert.equal(run.status, 0, `${name}: ${run.stderr || run.error}`)
      results.push({ name, result: JSON.parse(run.stdout) })
    }
    process.stdout.write(`${JSON.stringify({ status: 'pass', results })}\n`)
  }
  finally {
    await rm(directory, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
