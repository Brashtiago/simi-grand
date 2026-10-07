import { useState, useEffect } from 'react';

interface SmartImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackSrc?: string;
}

export default function SmartImage({ src, alt, className, fallbackSrc }: SmartImageProps) {
  const [currentSrc, setCurrentSrc] = useState(src);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setCurrentSrc(fallbackSrc || src);
    setFailed(false);
  }, [src, fallbackSrc]);

  if (failed || !currentSrc) {
    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-br from-[#8B7355]/30 to-[#1A1C1E] ${className || ''}`}
        role="img"
        aria-label={alt}
      >
        <span className="px-4 text-center text-xs uppercase tracking-[0.2em] text-white/40">
          {alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
