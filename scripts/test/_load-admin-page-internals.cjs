'use strict';

// Loads the REAL app/admin/page.js source and exposes its module-local
// helpers (not exported today — the page only exports its default
// component) for direct testing, same technique as
// _load-admin-reports-internals.cjs: the real source is read from disk,
// ONE export line is appended in memory, then compiled — the file on disk
// is never touched.
//
// Exposed: resolveGrade (the "التقييم" letter), and — added 2026-10-09 with
// decision 7 (the sessionStorage cache no longer holds full documents) —
// fetchStats / readCache / writeCache / purgeLegacyCache / CACHE_KEY /
// LEGACY_CACHE_KEYS (the real fetch-and-cache path) and RecentReportsTable
// (the real "آخر 10 فحوصات" table).

require('./_jsx-require-hook.cjs');

const fs = require('fs');
const path = require('path');
const Module = require('module');
const { transform } = require('sucrase');

const FILE = path.join(__dirname, '..', '..', 'app', 'admin', 'page.js');

function load() {
  const src = fs.readFileSync(FILE, 'utf8');
  const marker = 'function resolveGrade(report) {';
  if (!src.includes(marker)) {
    throw new Error(
      "app/admin/page.js has changed shape — resolveGrade's signature marker was not found. Update this test loader to match."
    );
  }
  const patched =
    src +
    '\n\nmodule.exports.__test__ = { resolveGrade, fetchStats, readCache, writeCache, purgeLegacyCache, RecentReportsTable, CACHE_KEY, LEGACY_CACHE_KEYS };\n';

  const { code } = transform(patched, {
    transforms: ['jsx', 'imports'],
    production: true,
    filePath: FILE,
    jsxRuntime: 'automatic',
  });

  const mod = new Module(FILE, module);
  mod.filename = FILE;
  mod.paths = Module._nodeModulePaths(path.dirname(FILE));
  mod._compile(code, FILE);
  return mod.exports.__test__;
}

module.exports = load();
