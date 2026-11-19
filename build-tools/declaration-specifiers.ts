import { existsSync } from 'node:fs'
import path from 'node:path'
import ts from 'typescript'

/** Adds NodeNext ESM extensions to emitted declaration module specifiers. */
export function processDeclarationSpecifiers(sourceFile: string, content: string): string {
  const file = ts.createSourceFile(sourceFile, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
  const replacements: Array<{ position: number, suffix: string }> = []

  const collect = (literal: ts.StringLiteral): void => {
    const relative = literal.text
    if (!/^\.{1,2}\//.test(relative) || /\.(?:[cm]?[jt]sx?|json)$/i.test(relative)) {
      return
    }
    const sourcePath = path.resolve(path.dirname(sourceFile), relative)
    const leafExists = existsSync(`${sourcePath}.ts`) || existsSync(`${sourcePath}.d.ts`)
    const suffix = !leafExists && existsSync(path.join(sourcePath, 'index.ts')) ? '/index.js' : '.js'
    replacements.push({ position: literal.getEnd() - 1, suffix })
  }

  const visit = (node: ts.Node): void => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      collect(node.moduleSpecifier)
    }
    else if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument) && ts.isStringLiteral(node.argument.literal)) {
      collect(node.argument.literal)
    }
    ts.forEachChild(node, visit)
  }
  visit(file)

  for (const replacement of replacements.sort((a, b) => b.position - a.position)) {
    content = content.slice(0, replacement.position) + replacement.suffix + content.slice(replacement.position)
  }
  return content
}
