import { readFile, readdir } from 'node:fs/promises'
import { join, relative, resolve } from 'node:path'

const root = process.cwd()
const fixedFiles = ['README.md', 'README.zh.md', 'SPEC.md', 'CONTRIBUTING.md', 'SECURITY.md']
const docsRoot = resolve(root, 'docs')

async function collect(directory) {
  const entries = await readdir(directory, { withFileTypes: true }).catch((error) => {
    if (error?.code === 'ENOENT') return []
    throw error
  })
  const files = []
  for (const entry of entries) {
    if (entry.name === 'agents') continue // repo-internal agent docs, not shipped
    const path = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...await collect(path))
    else if (entry.isFile() && entry.name.endsWith('.md')) files.push(path)
  }
  return files
}

const files = [...fixedFiles.map((file) => resolve(root, file)), ...await collect(docsRoot)]
const banned = [
  { pattern: /本包不发布\s*(到\s*)?npm/, message: 'stale: the package is published to npm' },
  { pattern: /此包不发布\s*(到\s*)?npm/, message: 'stale: the package is published to npm' },
  { pattern: /This package is not published to npm/i, message: 'stale: the package is published to npm' },
  { pattern: /No npm package is published/i, message: 'stale: the package is published to npm' },
  { pattern: /没有原地升级\s*API/, message: 'stale: registry-installed bundles update in place' },
  { pattern: /no in-place upgrade/i, message: 'stale: registry-installed bundles update in place' },
  { pattern: /卸载\s*→\s*装新地址/, message: 'stale: registry-installed bundles update in place' },
]
const legacyAuth = /--auth-type=legacy/
const warningContext = /(不要|别用|禁止|never|do not)/i
let failed = false

for (const file of files) {
  const text = await readFile(file, 'utf8').catch(() => '')
  const lines = text.split(/\r?\n/)
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    for (const rule of banned) {
      if (!rule.pattern.test(line)) continue
      console.error(`${relative(root, file)}:${index + 1}: ${rule.message}`)
      console.error(`  ${line.trim()}`)
      failed = true
    }
    if (legacyAuth.test(line) && !warningContext.test(line)) {
      console.error(`${relative(root, file)}:${index + 1}: --auth-type=legacy needs an explicit warning; a security-key account has no OTP to enter`)
      console.error(`  ${line.trim()}`)
      failed = true
    }
  }
}

if (failed) process.exitCode = 1
else console.log(`Documentation drift check passed for ${files.length} Markdown files.`)
