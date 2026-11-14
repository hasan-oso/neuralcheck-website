// Server component: static-export entry point for /shop/[slug].
//
// IMPORTANT — why we return `[{ slug: '_' }]` instead of `[]`:
//
// Next.js with `output: 'export'` REQUIRES generateStaticParams to return
// at least one param. Returning an empty array fails the build with:
//   Error: Page "/shop/[slug]" is missing "generateStaticParams()"
//   so it cannot be used with "output: export" config.
//
// Real shop slugs aren't known at build time (they're created in the admin
// panel after deploy), so we generate exactly ONE placeholder page at
// /shop/_/index.html, and Firebase Hosting rewrites every /shop/** request
// to that same shell (see firebase.json). The actual slug is read at
// runtime from window.location.pathname inside ShopClient — useParams()
// would return '_' here because that's what was rendered at build time.

import ShopClient from './ShopClient';

export async function generateStaticParams() {
  return [{ slug: '_' }];
}

export default function ShopPage() {
  return <ShopClient />;
}
