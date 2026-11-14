import { CheckIcon } from '@heroicons/react/24/solid';

export default function PricingCard({
  name,
  price,
  priceLocal,
  desc,
  features,
  highlight,
  popular,
  badge,
  cta,
  href = '/#download',
}) {
  const borderClass = popular
    ? 'border-nc-green/60 nc-popular-ring'
    : highlight === 'cyan'
    ? 'border-nc-cyan/40 shadow-[0_0_30px_rgba(56,189,248,0.12)]'
    : highlight === 'green'
    ? 'border-nc-green/40'
    : 'border-nc-border';

  const scaleClass = popular ? 'md:scale-[1.04] md:-my-2 z-10' : '';

  const btnClass = popular
    ? 'nc-gradient-bg text-nc-bg hover:brightness-110 shadow-lg shadow-nc-green/30'
    : highlight === 'cyan'
    ? 'bg-nc-cyan text-nc-bg hover:brightness-110'
    : highlight === 'green'
    ? 'bg-nc-green text-nc-bg hover:brightness-110'
    : 'bg-nc-surface text-nc-text1 border border-nc-border hover:border-nc-green/50';

  return (
    <div
      className={`relative p-6 sm:p-7 rounded-2xl bg-nc-card border-2 ${borderClass} ${scaleClass} flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl`}
    >
      {popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold nc-gradient-bg text-nc-bg whitespace-nowrap shadow-lg shadow-nc-green/30">
          ★ {badge}
        </div>
      )}
      {!popular && badge && (
        <div className="absolute -top-3 start-6 px-3 py-1 rounded-full text-xs font-bold nc-gradient-bg text-nc-bg">
          {badge}
        </div>
      )}

      <h3 className="text-xl font-semibold text-nc-text1">{name}</h3>
      <div className="mt-4 text-4xl font-outfit font-extrabold nc-gradient-text">
        {price}
      </div>
      {priceLocal && (
        <div className="mt-1 text-xs text-nc-text3 font-medium">
          {priceLocal}
        </div>
      )}
      <p className="mt-2 text-sm text-nc-text2">{desc}</p>

      <ul className="mt-6 flex-1 flex flex-col gap-3">
        {(features || []).map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-nc-text2">
            <CheckIcon className="w-5 h-5 text-nc-green flex-shrink-0 mt-0.5" />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <a
        href={href}
        className={`mt-6 w-full py-3 rounded-xl font-semibold transition text-center inline-flex items-center justify-center ${btnClass}`}
      >
        {cta}
      </a>
    </div>
  );
}
