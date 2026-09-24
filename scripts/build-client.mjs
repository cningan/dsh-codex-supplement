import { readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const modules = [
  { name: 'codexOAuth', path: 'src/client/oauth.js' },
  { name: 'codexMedia', path: 'src/client/media.js' },
]

function extractFactory(source, path) {
  const marker = 'factory: (require) => {'
  const start = source.indexOf(marker)
  if (start < 0) throw new Error(`${path} has no Client factory`)
  const bodyStart = start + marker.length
  const end = source.indexOf('\n  },\n  cssIds:', bodyStart)
  if (end < 0) throw new Error(`${path} has no Client factory footer`)
  return source.slice(bodyStart, end)
}

const factories = []
for (const module of modules) {
  const path = resolve(root, module.path)
  const source = await readFile(path, 'utf8')
  factories.push({ name: module.name, body: extractFactory(source.replace(/\r\n/g, '\n'), module.path) })
}

const output = `window.__ModuleLoader__.load({
  id: "@local/dsh-codex-supplement",
  factory: (require) => {
    const createCodexOAuth = (require) => {${factories[0].body}\n    };
    const createCodexMedia = (require) => {${factories[1].body}\n    };
    const oauth = createCodexOAuth(require);
    const media = createCodexMedia(require);
    return {
      inject: [...new Set([...(oauth.inject ?? []), ...(media.inject ?? [])])],
      apply(ctx) {
        const mediaSettings = media.apply(ctx);
        oauth.apply(ctx, mediaSettings);
      },
    };
  },
  cssIds: [],
  depIds: ["react", "react/jsx-runtime"],
  cssEntries: [],
});
`

await writeFile(resolve(root, 'lib/client.js'), output, 'utf8')
console.log('Built the single Codex Supplement Client module from the retained UI sources.')
