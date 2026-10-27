import path from 'node:path'
import dts from 'unplugin-dts/vite'
import { defineConfig } from 'vite'

const externalPackages = [
  '@microsoft/fetch-event-source',
  '@typedworks/federation',
  'class-transformer',
  'class-validator',
  'date-fns',
  'date-fns-tz',
  'lodash',
  'reflect-metadata',
  'ts-luxon',
  'uuid',
]

function isExternal(id: string): boolean {
  return externalPackages.some(pkg => id === pkg || id.startsWith(`${pkg}/`))
}

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      name: 'endge-utils',
    },
    rollupOptions: {
      external: isExternal,
      output: {
        // Сериализация сохраняет общую инициализацию Reflect для своих public API.
        onlyExplicitManualChunks: true,
        manualChunks(id) {
          const sourcePath = path.relative(path.resolve(__dirname, 'src'), id)
          return sourcePath.startsWith(`serialize${path.sep}`)
            || sourcePath.startsWith(`shared${path.sep}serialize${path.sep}`)
            ? 'serialize'
            : undefined
        },
      },
    },
  },
  plugins: [dts({ bundleTypes: false, tsconfigPath: './tsconfig.app.json' })],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
