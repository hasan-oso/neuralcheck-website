// Server component: static-export entry point for /print/[shortId].
//
// Same trick as /shop/[slug]: Next.js with `output: 'export'` requires
// generateStaticParams to return at least one entry. Real shortIds aren't
// known at build time, so we render a single placeholder page and let
// Firebase Hosting rewrite every /print/** request to it.
// PrintClient reads the actual shortId from window.location.pathname.

import PrintClient from './PrintClient';

export const metadata = {
  title: 'NeuralCheck Report',
  description: 'Print-friendly NeuralCheck device report.',
  robots: { index: false, follow: false },
};

export async function generateStaticParams() {
  return [{ shortId: '_' }];
}

export default function PrintPage() {
  return <PrintClient />;
}
