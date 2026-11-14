'use strict';

// Loads the REAL app/admin/reports/page.js source and exposes its
// module-local helpers (ReportModal, resolveVerdict, resolveIssues,
// resolveDetails, resolveCategoryScores, resolveGrade, isV7Report) for
// direct testing — none of them are exported today (the page only exports
// its default component), so this appends ONE line re-exporting them,
// AFTER the real source is read from disk and BEFORE it is compiled. The
// file on disk is never modified; this only affects the in-memory copy
// this test process loads. The rest of the file — every line the site
// actually ships — is unpatched, unminified, byte-identical to disk.
//
// This exists so app/admin/reports/page.js's V6/V7 field-parity branches
// (added by this task) can be exercised through the REAL ReportModal
// component with react-dom/server, not a reimplementation of its logic —
// same rule-30 rationale as the other two test files in this directory.

require('./_jsx-require-hook.cjs');

const fs = require('fs');
const path = require('path');
const Module = require('module');
const { transform } = require('sucrase');

const FILE = path.join(__dirname, '..', '..', 'app', 'admin', 'reports', 'page.js');

function load() {
  const src = fs.readFileSync(FILE, 'utf8');
  const marker = "function ReportModal({ report, usersMap, onClose }) {";
  if (!src.includes(marker)) {
    throw new Error(
      'app/admin/reports/page.js has changed shape — ReportModal\'s signature marker was not found. Update this test loader to match.'
    );
  }
  const patched =
    src +
    '\n\nmodule.exports.__test__ = { ReportModal, resolveVerdict, resolveIssues, resolveDetails, resolveCategoryScores, resolveGrade, isV7Report };\n';

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
