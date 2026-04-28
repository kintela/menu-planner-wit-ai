const path = require("path")

process.env.BROWSERSLIST_IGNORE_OLD_DATA = "true"
process.env.BASELINE_BROWSER_MAPPING_IGNORE_OLD_DATA = "true"

const originalWarn = console.warn

console.warn = (...args) => {
  const text = args
    .map((arg) => {
      if (arg instanceof Error) return arg.message
      return String(arg)
    })
    .join(" ")

  if (text.includes("[baseline-browser-mapping] The data in this module is over two months old.")) {
    return
  }

  originalWarn(...args)
}

process.argv = ["node", "eslint", "."]
require(path.join(__dirname, "..", "node_modules", "eslint", "bin", "eslint.js"))
