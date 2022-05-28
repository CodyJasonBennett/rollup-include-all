# rollup-include-all

A rollup plugin to include all files despite tree-shaking.

## Installation

```bash
npm install rollup-include-all
```

## Usage with Rollup or Vite

```js
// with CJS
const includeAll = require('rollup-include-all')
module.exports = { plugins: [] }

// or, with ESM
import includeAll from 'rollup-include-all'
return { plugins: [includeAll()] }
```
