import path from 'path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import dts from 'vite-plugin-dts'

const externalPackages = [
  '@endge/nova',
  '@endge/nova-ui-kit',
  '@endge/utils',
  '@microsoft/fetch-event-source',
  'class-transformer',
  'class-validator',
  'cookie-es',
  'date-fns',
  'date-fns-tz',
  'destr',
  'lodash',
  'pinia',
  'reflect-metadata',
  'ts-luxon',
  'uuid',
  'vue',
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
  plugins: [vue(), dts({ rollupTypes: true, tsconfigPath: './tsconfig.app.json', logLevel: 'silent' })],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
