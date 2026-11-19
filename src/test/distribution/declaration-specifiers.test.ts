import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { processDeclarationSpecifiers } from '../../../build-tools/declaration-specifiers'

describe('esm specifiers опубликованных declarations', () => {
  let directory: string
  let sourceFile: string

  beforeEach(() => {
    directory = mkdtempSync(path.join(os.tmpdir(), 'utils-declaration-specifiers-'))
    const sourceDirectory = path.join(directory, 'src')
    sourceFile = path.join(sourceDirectory, 'index.ts')
    mkdirSync(path.join(sourceDirectory, 'collection'), { recursive: true })
    writeFileSync(path.join(sourceDirectory, 'collection/index.ts'), 'export interface Item {}\n')
    writeFileSync(path.join(sourceDirectory, 'collection/collection.types.ts'), 'export interface Item {}\n')
    writeFileSync(path.join(sourceDirectory, 'file.ts'), 'export interface Item {}\n')
    writeFileSync(path.join(sourceDirectory, 'setup.ts'), 'export {}\n')
    writeFileSync(path.join(directory, 'sibling.ts'), 'export interface Item {}\n')
  })

  afterEach(() => rmSync(directory, { recursive: true, force: true }))

  it('добавляет .js к относительным export, type import и side-effect import', () => {
    const input = `export * from './file';
export type { Item } from "./file";
import type { Item } from './file';
import './setup';
export type Loaded = typeof import('./file');
`
    expect(processDeclarationSpecifiers(sourceFile, input)).toBe(`export * from './file.js';
export type { Item } from "./file.js";
import type { Item } from './file.js';
import './setup.js';
export type Loaded = typeof import('./file.js');
`)
  })

  it('различает directory index и stem с .types, сохраняя относительный путь', () => {
    const sourceDirectory = path.dirname(sourceFile)
    mkdirSync(path.join(sourceDirectory, 'file'))
    writeFileSync(path.join(sourceDirectory, 'file/index.ts'), 'export interface DirectoryItem {}\n')
    writeFileSync(path.join(sourceDirectory, 'declared.d.ts'), 'export interface DeclaredItem {}\n')
    mkdirSync(path.join(sourceDirectory, 'declared'))
    writeFileSync(path.join(sourceDirectory, 'declared/index.ts'), 'export interface DirectoryItem {}\n')
    const input = `export * from './collection';
export * from './collection/collection.types';
export * from './file';
export * from './declared';
export * from '../sibling';
`
    expect(processDeclarationSpecifiers(sourceFile, input)).toBe(`export * from './collection/index.js';
export * from './collection/collection.types.js';
export * from './file.js';
export * from './declared.js';
export * from '../sibling.js';
`)
  })

  it.each(['./file.js', './file.mjs', './file.cjs', './file.json', './file.d.ts', './file.ts'])('сохраняет уже явное расширение %s', (specifier) => {
    const input = `export * from '${specifier}';\n`
    expect(processDeclarationSpecifiers(sourceFile, input)).toBe(input)
  })

  it('не меняет bare package imports, комментарии и строковые литералы', () => {
    const input = `import 'reflect-metadata';
export * from '@typedworks/federation';
/** Example: export * from './file' */
export declare const example: "export * from './file'";
`
    expect(processDeclarationSpecifiers(sourceFile, input)).toBe(input)
  })

  it('повторно обрабатывает declarations без новых изменений', () => {
    const input = `export * from './collection';\nexport type Item = import('./file').Item;\n`
    const output = processDeclarationSpecifiers(sourceFile, input)
    expect(processDeclarationSpecifiers(sourceFile, output)).toBe(output)
  })
})
