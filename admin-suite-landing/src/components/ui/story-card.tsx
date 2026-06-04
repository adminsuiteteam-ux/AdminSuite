import { useEffect, useRef, useState } from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StoryCardProps {
  step: string;
  title: string;
  description: string;
  icon: LucideIcon;
  imageSrc: string;
  alignment?: 'left' | 'right';
  glowColor?: string;
}

export function StoryCard({
  step,
  title,
  description,
  icon: Icon,
  imageSrc,
  alignment = 'left',
  glowColor = 'rgba(94, 106, 210, 0.15)'
}: StoryCardProps) {
  const isLeft = alignment === 'left';
  const containerRef = useRef<HTMLDivElement>(null);
  const [opacity, setOpacity] = useState(1);
  const [transformY, setTransformY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      // Start fading out when the top of the element passes 15% of viewport height
      const threshold = windowHeight * 0.15;
      if (rect.top < threshold) {
        const exitProgress = Math.min(1, Math.max(0, (threshold - rect.top) / (windowHeight * 0.45)));
        setOpacity(1 - exitProgress);
        setTransformY(-exitProgress * 24);
      } else {
        setOpacity(1);
        setTransformY(0);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div 
      ref={containerRef}
      className={cn(
        "w-full flex flex-col md:flex-row items-center gap-12 py-24 px-4 md:px-8 relative z-10 transition-all duration-300 ease-out",
        isLeft ? "md:flex-row" : "md:flex-row-reverse"
      )}
      style={{
        opacity: opacity,
        transform: `translateY(${transformY}px)`
      }}
    >
      {/* Visual Mockup Box */}
      <div className="w-full md:w-1/2 flex justify-center items-center relative">
        {/* Glow backdrop bubble */}
        <div 
          className="absolute w-[280px] h-[280px] md:w-[380px] md:h-[380px] rounded-full blur-3xl opacity-30 pointer-events-none z-0"
          style={{ backgroundColor: glowColor }}
        />
        
        {/* App Screenshot */}
        <div className="relative z-10 transition-transform duration-500 hover:scale-[1.03] select-none">
          <img 
            src={imageSrc} 
            alt={title}
            className="w-56 md:w-64 h-auto object-contain drop-shadow-[0_25px_60px_rgba(0,0,0,0.8)]"
          />
        </div>
      </div>

      {/* Storyteller description block */}
      <div className="w-full md:w-1/2 space-y-6 text-left">
        {/* Step tracker label */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-xs font-semibold uppercase tracking-widest text-accent">
          <Icon className="w-3.5 h-3.5" />
          <span>{step}</span>
        </div>

        {/* Title */}
        <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-white leading-tight">
          {title}
        </h2>

        {/* Description */}
        <p className="text-zinc-600 dark:text-white/60 text-sm md:text-base leading-relaxed max-w-xl">
          {description}
        </p>

        {/* Decorative divider */}
        <div className="h-[1px] w-24 bg-gradient-to-r from-accent to-transparent mt-4" />
      </div>
    </div>
  );
}
