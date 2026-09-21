import path from 'node:path'
import dts from 'unplugin-dts/vite'
import { defineConfig } from 'vite'

const externalPackages = [
  '@microsoft/fetch-event-source',
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
    },
  },
  plugins: [dts({ bundleTypes: false, tsconfigPath: './tsconfig.app.json' })],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
