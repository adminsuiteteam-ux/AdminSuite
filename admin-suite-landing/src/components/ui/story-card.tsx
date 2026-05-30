import React from 'react';
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

  return (
    <div className={cn(
      "w-full flex flex-col md:flex-row items-center gap-12 py-16 px-4 md:px-8 relative z-10",
      isLeft ? "md:flex-row" : "md:flex-row-reverse"
    )}>
      {/* Visual Mockup Box */}
      <div className="w-full md:w-1/2 flex justify-center items-center relative">
        {/* Glow backdrop bubble */}
        <div 
          className="absolute w-[280px] h-[280px] md:w-[380px] md:h-[380px] rounded-full blur-3xl opacity-30 pointer-events-none z-0"
          style={{ backgroundColor: glowColor }}
        />
        
        {/* Mockup Frame wrapper */}
        <div className="relative w-56 h-[440px] md:w-64 md:h-[500px] z-10 transition-transform duration-500 hover:scale-[1.03] select-none">
          <div className="w-full h-full rounded-[2.5rem] p-1.5 bg-zinc-950 border border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.85)] overflow-hidden flex items-center justify-center">
            <img 
              src={imageSrc} 
              alt={title}
              className="object-cover w-full h-full rounded-[2.2rem] border border-white/5"
            />
          </div>
        </div>
      </div>

      {/* Storyteller description block */}
      <div className="w-full md:w-1/2 space-y-6 text-left">
        {/* Step tracker label */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold uppercase tracking-widest text-accent">
          <Icon className="w-3.5 h-3.5" />
          <span>{step}</span>
        </div>

        {/* Title */}
        <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
          {title}
        </h2>

        {/* Description */}
        <p className="text-white/60 text-sm md:text-base leading-relaxed max-w-xl">
          {description}
        </p>

        {/* Decorative divider */}
        <div className="h-[1px] w-24 bg-gradient-to-r from-accent to-transparent mt-4" />
      </div>
    </div>
  );
}
