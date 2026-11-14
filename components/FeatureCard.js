const COLORS = {
  green: {
    surface: 'bg-nc-green/10',
    text: 'text-nc-green',
    hoverBorder: 'hover:border-nc-green/50',
    hoverGlow: 'hover:shadow-[0_0_40px_rgba(74,222,128,0.2)]',
  },
  cyan: {
    surface: 'bg-nc-cyan/10',
    text: 'text-nc-cyan',
    hoverBorder: 'hover:border-nc-cyan/50',
    hoverGlow: 'hover:shadow-[0_0_40px_rgba(56,189,248,0.2)]',
  },
  neon: {
    surface: 'bg-nc-neon/10',
    text: 'text-nc-neon',
    hoverBorder: 'hover:border-nc-neon/50',
    hoverGlow: 'hover:shadow-[0_0_40px_rgba(34,211,238,0.22)]',
  },
  glow: {
    surface: 'bg-nc-glow/10',
    text: 'text-nc-glow',
    hoverBorder: 'hover:border-nc-glow/50',
    hoverGlow: 'hover:shadow-[0_0_40px_rgba(163,230,53,0.22)]',
  },
};

export default function FeatureCard({
  Icon,
  iconColor = 'green',
  icon,
  title,
  desc,
}) {
  const c = COLORS[iconColor] || COLORS.green;

  return (
    <div
      className={`group relative p-6 rounded-2xl bg-nc-card border border-nc-border ${c.hoverBorder} ${c.hoverGlow} transition-all duration-300 hover:-translate-y-1 h-full`}
    >
      <div
        className={`w-12 h-12 rounded-xl ${c.surface} ${c.text} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
      >
        {Icon ? <Icon className="w-6 h-6" strokeWidth={1.6} /> : <span className="text-2xl">{icon}</span>}
      </div>
      <h3 className="text-lg font-semibold text-nc-text1 mb-2">{title}</h3>
      <p className="text-nc-text2 text-sm leading-relaxed">{desc}</p>
    </div>
  );
}
