'use client';

export default function Spinner({ size = 'md', className = '' }) {
  const cls =
    size === 'sm'
      ? 'w-4 h-4 border-2'
      : size === 'lg'
      ? 'w-12 h-12 border-4'
      : 'w-6 h-6 border-2';
  return (
    <span
      className={`inline-block ${cls} border-nc-border border-t-nc-green rounded-full animate-spin ${className}`}
    />
  );
}

export function PageSpinner({ label = 'جاري التحميل...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="relative">
        <div className="w-14 h-14 border-4 border-nc-border border-t-nc-green rounded-full animate-spin" />
        <div
          className="absolute inset-0 w-14 h-14 border-4 border-transparent border-b-nc-cyan rounded-full animate-spin"
          style={{ animationDuration: '1.2s', animationDirection: 'reverse' }}
        />
      </div>
      <p className="text-sm text-nc-text3">{label}</p>
    </div>
  );
}
