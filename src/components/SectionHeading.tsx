interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: 'left' | 'center';
  light?: boolean;
}

export default function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'center',
  light = false,
}: SectionHeadingProps) {
  return (
    <div className={`${align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}`}>
      {eyebrow && (
        <p
          className={`text-xs uppercase tracking-[0.25em] ${
            light ? 'text-amber-200/70' : 'text-[#8B7355]'
          }`}
        >
          {eyebrow}
        </p>
      )}
      <h2
        className={`mt-3 font-heading text-3xl font-medium leading-tight sm:text-4xl lg:text-5xl ${
          light ? 'text-white' : 'text-[#1A1C1E]'
        }`}
      >
        {title}
      </h2>
      {description && (
        <p
          className={`mt-4 text-base leading-relaxed ${
            light ? 'text-white/70' : 'text-[#4a4a4a]'
          }`}
        >
          {description}
        </p>
      )}
    </div>
  );
}
