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
  let entryFile

  return {
    buildStart(config) {
      // Disable tree-shaking to preserve exports
      config.treeshake = false

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

          return acc + `import '${localPath}'\n`
        }, ''),
      )
    },
    generateBundle(_, bundle) {
      // Don't emit flatbundle
      if (entryFile) {
        const { name } = path.parse(entryFile)
        for (const key in bundle) {
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
