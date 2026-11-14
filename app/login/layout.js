export const metadata = {
  title: 'Sign In — NeuralCheck',
  description:
    'Sign in to your NeuralCheck account to manage your scans, reports, and shop.',
  openGraph: {
    title: 'Sign In — NeuralCheck',
    description:
      'Sign in to your NeuralCheck account to manage your scans, reports, and shop.',
    url: 'https://neuralcheck.net/login',
    siteName: 'NeuralCheck',
    type: 'website',
  },
  robots: { index: false, follow: false },
};

export default function LoginLayout({ children }) {
  return children;
}
