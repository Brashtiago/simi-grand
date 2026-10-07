import SmartImage from '@/components/SmartImage';

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  image: string;
}

export default function PageHeader({ eyebrow, title, description, image }: PageHeaderProps) {
  return (
    <section className="relative flex h-[50vh] min-h-[350px] items-end overflow-hidden">
      <div className="absolute inset-0">
        <SmartImage src={image} alt={title} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#1A1C1E]/50 via-[#1A1C1E]/40 to-[#1A1C1E]/80" />
      </div>
      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-12 lg:px-8">
        {eyebrow && (
          <p className="animate-fade-in text-xs uppercase tracking-[0.3em] text-amber-200/70">{eyebrow}</p>
        )}
        <h1 className="animate-fade-up mt-3 font-heading text-4xl font-light text-white sm:text-5xl lg:text-6xl">
          {title}
        </h1>
        {description && (
          <p className="animate-fade-up mt-4 max-w-xl text-base leading-relaxed text-white/70">{description}</p>
        )}
      </div>
    </section>
  );
}
