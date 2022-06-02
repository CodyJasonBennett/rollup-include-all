const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const crawl = (dirPath) =>
  fs.readdirSync(dirPath).flatMap((fileName) => {
    const filePath = path.resolve(dirPath, fileName)
    return fs.lstatSync(filePath).isDirectory() ? crawl(filePath) : filePath
  })

/**
 * A rollup plugin to include all files despite tree-shaking.
 */
function rollupIncludeAll() {
  const name = 'rollup-include-all'
  if (process.env.NODE_ENV !== 'production') return { name }

  let entryFile

  return {
    name,
    buildStart(config) {
      // Disable tree-shaking to preserve exports
      config.output = { ...config.output, preserveModules: true }

      // Transform flatbundle as entrypoint
      const { dir, ext } = path.parse(config.input[0])
      entryFile = config.input[0] = path.resolve(dir, crypto.randomUUID() + ext)

      // Include everything in flatbundle
      fs.writeFileSync(
        entryFile,
        crawl(dir).reduce((acc, filePath) => {
          const localPath = filePath
            .replace(dir, '.') // convert to local path
            .replace(/\\+/g, '/') // normalize Unix path separators
            .replace(/\.\w+$/, '') // remove file extensions

          const namespace = crypto.randomUUID().replace(/\d|\-/g, '')
          return acc + `import * as ${namespace} from '${localPath}';export { ${namespace} };\n`
        }, ''),
      )
    },
    renderChunk(code) {
      return code.replace(/(?!from\s?['"][^'"]+)\.(cjs|mjs|jsx?|tsx?)(?=['"])/g, '')
    },
    generateBundle(_, bundle) {
      // Don't emit flatbundle
      if (entryFile) {
        const { name } = path.parse(entryFile)
        for (const key in bundle) {
          // Don't emit types
          if (!bundle[key].exports.length) delete bundle[key]
          // Remove virtual entrypoint
          if (key.startsWith(name)) delete bundle[key]
        }
      }
    },
    buildEnd() {
      // Cleanup src flatbundle shim
      if (entryFile) fs.unlinkSync(entryFile)
    },
  }
}

module.exports = rollupIncludeAll
module.exports.rollupIncludeAll = rollupIncludeAll
module.exports.default = rollupIncludeAll
