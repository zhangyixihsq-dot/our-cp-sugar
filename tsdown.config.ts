import { readFile } from 'node:fs/promises'
import { basename, dirname, extname, isAbsolute, relative, resolve, sep } from 'node:path'
import type { UserConfig } from 'tsdown'
import { transform } from 'lightningcss'

const PLUGIN_ID = '@zyixi/our-cp-sugar'
const CSS_PREFIX = '\0dsh-css:'
const CSS_SUFFIX = '.mjs'
const ASSET_PREFIX = '\0dsh-asset:'
const ASSET_SUFFIX = '.asset.mjs'
const PROJECT_ROOT = process.cwd()

const projectRelative = (path: string): string =>
  relative(PROJECT_ROOT, path).split(sep).join('/')

const projectAbsolute = (path: string): string =>
  isAbsolute(path) ? path : resolve(PROJECT_ROOT, path)

const host: UserConfig = {
  name: PLUGIN_ID,
  entry: ['src/index.ts'],
  outDir: 'lib',
  format: 'esm',
  platform: 'node',
  target: 'es2024',
  fixedExtension: false,
  dts: false,
  clean: false,
  deps: { neverBundle: ['@deepseek-ai/cordis'] },
}

const client: UserConfig = {
  name: `${PLUGIN_ID}/client`,
  entry: { client: 'src/client/index.ts' },
  outDir: 'lib',
  format: 'cjs',
  platform: 'browser',
  target: 'es2022',
  dts: false,
  sourcemap: true,
  clean: false,
  deps: {
    neverBundle: [
      '@deepseek-ai/cordis',
      '@deepseek-ai/dsh-client-runtime',
      '@deepseek-ai/dsh-client-ui-settings',
      '@deepseek-ai/dsh-client-ui-slots',
      'react',
      'react/jsx-runtime',
    ],
  },
  plugins: [{
    name: 'dsh-css-modules-inline',
    resolveId(source: string, importer?: string) {
      if (importer === undefined) return null
      if (source.endsWith('.module.css')) {
        return CSS_PREFIX + projectRelative(resolve(dirname(importer), source)) + CSS_SUFFIX
      }
      if (source.endsWith('.png') || source.endsWith('.gif') || source.endsWith('.webp')) {
        return ASSET_PREFIX + projectRelative(resolve(dirname(importer), source)) + ASSET_SUFFIX
      }
      return null
    },
    async load(id: string) {
      if (id.startsWith(ASSET_PREFIX)) {
        const filename = projectAbsolute(id.slice(ASSET_PREFIX.length, -ASSET_SUFFIX.length))
        this.addWatchFile(filename)
        const source = await readFile(filename)
        const extension = extname(filename).toLowerCase()
        const mime = extension === '.gif' ? 'image/gif' : extension === '.webp' ? 'image/webp' : 'image/png'
        return `export default ${JSON.stringify(`data:${mime};base64,${source.toString('base64')}`)};`
      }
      if (!id.startsWith(CSS_PREFIX)) return null
      const filename = projectAbsolute(id.slice(CSS_PREFIX.length, -CSS_SUFFIX.length))
      this.addWatchFile(filename)
      const source = await readFile(filename)
      const result = transform({
        filename: basename(filename),
        code: source,
        cssModules: { pattern: '[hash]_[local]' },
        minify: true,
      })
      const classes = Object.fromEntries(
        Object.entries(result.exports ?? {})
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([local, value]) => [local, value.name]),
      )
      const tagId = `${PLUGIN_ID}/${basename(filename)}`
      return [
        `const css = ${JSON.stringify(result.code.toString())};`,
        `const tagId = ${JSON.stringify(tagId)};`,
        "if (typeof document !== 'undefined' && document.querySelector('style[data-plugin-css=' + JSON.stringify(tagId) + ']') === null) {",
        "  const tag = document.createElement('style');",
        `  tag.dataset.plugin = ${JSON.stringify(PLUGIN_ID)};`,
        '  tag.dataset.pluginCss = tagId;',
        '  tag.textContent = css;',
        '  document.head.appendChild(tag);',
        '}',
        `export default ${JSON.stringify(classes)};`,
      ].join('\n')
    },
  }],
  outputOptions: {
    entryFileNames: 'client.js',
    sourcemapPathTransform: source => isAbsolute(source) ? projectRelative(source) : source,
    banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(PLUGIN_ID)}, factory: (require) => {`,
    footer: 'return module.exports; } });',
    intro: 'var module = { exports: {} }; var exports = module.exports;',
  },
}

export default [host, client]
