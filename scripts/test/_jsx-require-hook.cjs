'use strict';

// Test-only require() hook — NOT part of the shipped site, NOT referenced
// by next.config.js/package.json's build scripts, NOT in
// scripts/check-render-surface.mjs's SURFACE list.
//
// WHY THIS EXISTS: this repo's components use JSX + ESM `export`, and
// Node's plain `require()` cannot load either without a transform. Next.js
// transforms both at build time via SWC, but that pipeline isn't reachable
// from a standalone script. This hook lets a plain `node scripts/test/*.cjs`
// invocation `require()` the REAL production source files — the actual
// component and reader code the site ships, not a reimplementation of it —
// and render them with react-dom/server for a true assertion on the output.
//
// This is the class of test lib/reportReaders/v7.js's readIssues doc
// comment warns is NOT enough on its own (a reader-only test that never
// calls through the component missed the severity double-classification
// bug — see that comment, and rule 30 in this task's order). Tests that
// import this hook render through the actual component tree, not just the
// reader function.
//
// `sucrase` (already a transitive dependency here, via tailwindcss/jiti —
// not added for this) transforms JSX + ESM import/export to CommonJS.
// `@/` specifiers are resolved to the repo root exactly like jsconfig.json's
// path alias, so production files can be required unmodified.

const path = require('path');
const fs = require('fs');
const Module = require('module');
const { transform } = require('sucrase');

const ROOT = path.resolve(__dirname, '..', '..');

const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
  if (request.startsWith('@/')) {
    request = path.join(ROOT, request.slice(2));
  }
  return origResolve.call(this, request, parent, isMain, options);
};

const origJs = Module._extensions['.js'];
Module._extensions['.js'] = function (mod, filename) {
  // node_modules ships its own valid CJS/ESM — never transform it, and
  // never transform this hook's own directory recursively by accident.
  if (filename.includes(`${path.sep}node_modules${path.sep}`)) {
    return origJs(mod, filename);
  }
  const src = fs.readFileSync(filename, 'utf8');
  // jsxRuntime: 'automatic' matches Next.js 14's default (the new JSX
  // transform, react/jsx-runtime) — these component files never import
  // `React` themselves, same as under the real Next build.
  const { code } = transform(src, {
    transforms: ['jsx', 'imports'],
    production: true,
    filePath: filename,
    jsxRuntime: 'automatic',
  });
  mod._compile(code, filename);
};

module.exports = { ROOT };
