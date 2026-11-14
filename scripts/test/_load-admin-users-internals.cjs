'use strict';

// Loads the REAL app/admin/users/page.js source and exposes its module-local
// pieces (the page exports only its default component) for direct testing —
// the same technique as _load-admin-page-internals.cjs: the real source is
// read from disk, ONE export line is appended in memory, then compiled. The
// file on disk is never touched.
//
// Exposed: the page component itself (AdminUsersPage — its handlers are
// closures inside it, reachable through the elements it returns, see
// _call-component.cjs), the three windows (GrantScansModal, GrantPlanModal,
// BulkGrantModal), the preview pieces (GrantPreview, BulkGrantPreview,
// grantPreview, GRANT_VALIDITY_MS) and the grant tables (PLAN_GRANTS,
// SCAN_OPTIONS).
//
// The caller installs its fakes (firebase/firestore, firebase/functions, the
// Toast hook) in require.cache BEFORE requiring this file.

require('./_jsx-require-hook.cjs');

const fs = require('fs');
const path = require('path');
const Module = require('module');
const { transform } = require('sucrase');

const FILE = path.join(__dirname, '..', '..', 'app', 'admin', 'users', 'page.js');

function load() {
  const src = fs.readFileSync(FILE, 'utf8');
  const marker = 'export default function AdminUsersPage() {';
  if (!src.includes(marker)) {
    throw new Error(
      "app/admin/users/page.js has changed shape — the AdminUsersPage signature marker was not found. Update this test loader to match."
    );
  }
  const patched =
    src +
    '\n\nmodule.exports.__test__ = { AdminUsersPage, GrantScansModal, GrantPlanModal, BulkGrantModal, GrantPreview, BulkGrantPreview, grantPreview, GRANT_VALIDITY_MS, PLAN_GRANTS, SCAN_OPTIONS };\n';

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
  return { ...mod.exports.__test__, SOURCE: src, FILE };
}

module.exports = load;
