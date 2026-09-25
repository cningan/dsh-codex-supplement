import { access, readFile, readdir } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { join, relative, resolve } from 'node:path'

const packageRoot = process.cwd()
const roots = ['lib', 'src/client', 'scripts', 'test']
const sourceExtensions = new Set(['.js', '.mjs', '.cjs'])
let failed = false

function fail(message) {
  console.error(message)
  failed = true
}

async function exists(path) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

async function collect(directory) {
  let entries
  try {
    entries = await readdir(directory, { withFileTypes: true })
  } catch (error) {
    if (error?.code === 'ENOENT') return []
    throw error
  }
  const files = []
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
    const path = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...await collect(path))
    else if (entry.isFile() && sourceExtensions.has(entry.name.slice(entry.name.lastIndexOf('.')))) files.push(path)
  }
  return files
}

const manifestPath = resolve(packageRoot, 'package.json')
let manifest
try {
  manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
} catch (error) {
  fail(`Invalid package.json: ${error instanceof Error ? error.message : String(error)}`)
}

if (manifest) {
  const expectedName = '@cningan/dsh-codex-supplement'
  if (manifest.name !== expectedName) fail(`package.json name must be ${expectedName}`)
  if (manifest.main !== './lib/index.js' || manifest.exports?.['.'] !== './lib/index.js') {
    fail('Host entry must be ./lib/index.js in main and exports["."]')
  }
  if (manifest.exports?.['./client'] !== './lib/client.js') fail('Client export must point to ./lib/client.js')
  if (!manifest.files?.includes('lib') || !manifest.files?.includes('cordis.patch.yml')) {
    fail('Package files allowlist must include lib and cordis.patch.yml')
  }
  if (manifest.dsh?.bundle?.patch !== './cordis.patch.yml') fail('dsh.bundle.patch must point to ./cordis.patch.yml')
  if (manifest.dsh?.client?.platform !== 'web') fail('dsh.client.platform must be web')

  const peers = manifest.peerDependencies ?? {}
  const peerMeta = manifest.peerDependenciesMeta ?? {}
  for (const dependency of manifest.dsh?.client?.inject ?? []) {
    if (!Object.prototype.hasOwnProperty.call(peers, dependency)) {
      fail(`Client inject ${dependency} must be declared as a peer dependency`)
    }
  }
  for (const dependency of Object.keys(peerMeta)) {
    if (!Object.prototype.hasOwnProperty.call(peers, dependency)) {
      fail(`peerDependenciesMeta contains undeclared dependency ${dependency}`)
    }
  }

  const patchReference = manifest.dsh?.bundle?.patch
  if (typeof patchReference !== 'string') fail('dsh.bundle.patch must be a package-relative path')
  else {
    const patchPath = resolve(packageRoot, patchReference)
    if (!await exists(patchPath)) fail(`Missing bundle patch ${relative(packageRoot, patchPath)}`)
    else {
      const patch = await readFile(patchPath, 'utf8')
      if (!/^\s+- id: codex-supplement\s*$/m.test(patch)) fail('Bundle patch must insert the codex-supplement row')
      if (!/^\s+name: '@cningan\/dsh-codex-supplement'\s*$/m.test(patch)) fail('Bundle patch package name does not match package.json')
    }
  }

  const clientReference = manifest.exports?.['./client']
  if (typeof clientReference !== 'string') fail('exports["./client"] must name the built Client module')
  else {
    const clientPath = resolve(packageRoot, clientReference)
    if (!await exists(clientPath)) fail('Missing built Client module at exports["./client"]')
    else {
      const client = await readFile(clientPath, 'utf8')
      const loaderRows = client.match(/window\.__ModuleLoader__\.load\s*\(/g) ?? []
      const packageIds = client.match(/\bid:\s*["']@cningan\/dsh-codex-supplement["']/g) ?? []
      if (loaderRows.length !== 1) fail(`Client bundle must contain one Loader row; found ${loaderRows.length}`)
      if (packageIds.length !== 1) fail(`Client bundle must contain one package Loader id; found ${packageIds.length}`)
      const settingsRows = client.match(/name:\s*["']settings\.section["']/g) ?? []
      if (settingsRows.length !== 1) fail(`Client bundle must contribute one merged settings page; found ${settingsRows.length}`)
      if (!client.includes('id: "@cningan/dsh-codex-supplement-settings"')) fail('Merged Codex settings page id is missing')
    }
  }
}

const clientPath = resolve(packageRoot, manifest?.exports?.['./client'] ?? 'lib/client.js')
if (await exists(clientPath)) {
  const client = await readFile(clientPath, 'utf8')
  if (client.includes('ModelListEditor') || client.includes('/models-list')) {
    fail('Client bundle must not duplicate the official OpenAI Codex model editor')
  }
}
const codexHostPath = resolve(packageRoot, 'lib/providers/codex/index.mjs')
if (await exists(codexHostPath)) {
  const codexHost = await readFile(codexHostPath, 'utf8')
  if (codexHost.includes('registerModelDiscovery') || codexHost.includes('/models-list')) {
    fail('Codex Supplement must not register a duplicate model catalog or model-list route')
  }
}

const files = []
for (const root of roots) files.push(...await collect(resolve(packageRoot, root)))
files.sort()
if (files.length === 0) fail(`No JavaScript source files found under ${roots.join(', ')}`)

for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], {
    cwd: packageRoot,
    stdio: 'inherit',
    windowsHide: true,
  })
  if (result.error) {
    fail(`Could not syntax-check ${relative(packageRoot, file)}: ${result.error.message}`)
  } else if (result.status !== 0) {
    failed = true
  }
}

if (failed) process.exitCode = 1
else console.log(`Package structure and syntax check passed for ${files.length} JavaScript files.`)
