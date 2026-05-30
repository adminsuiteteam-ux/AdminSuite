import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';

interface HeroProps extends React.HTMLAttributes<HTMLDivElement> {
  title: React.ReactNode;
  subtitle: string;
  images: { src: string; alt: string; }[];
}

export const HeroSection = React.forwardRef<HTMLDivElement, HeroProps>(
  ({ title, subtitle, images, className, ...props }, ref) => {
    const [currentIndex, setCurrentIndex] = React.useState(Math.floor(images.length / 2));

    const handleNext = React.useCallback(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, [images.length]);

    const handlePrev = () => {
      setCurrentIndex((prevIndex) => (prevIndex - 1 + images.length) % images.length);
    };
    
    React.useEffect(() => {
        const timer = setInterval(() => {
            handleNext();
        }, 4500);
        return () => clearInterval(timer);
    }, [handleNext]);

    return (
      <div
        ref={ref}
        className={cn(
          'relative w-full min-h-screen flex flex-col items-center justify-center overflow-x-hidden bg-black text-white p-4 py-24',
          className
        )}
        {...props}
      >
        {/* Background Gradient */}
        <div className="absolute inset-0 z-0 opacity-40 pointer-events-none" aria-hidden="true">
            <div className="absolute bottom-0 left-[-20%] right-0 top-[-10%] h-[600px] w-[600px] rounded-full bg-[radial-gradient(circle_farthest-side,rgba(94,106,210,0.22),rgba(255,255,255,0))]"></div>
            <div className="absolute bottom-0 right-[-20%] top-[-10%] h-[600px] w-[600px] rounded-full bg-[radial-gradient(circle_farthest-side,rgba(52,211,153,0.15),rgba(255,255,255,0))]"></div>
        </div>

        {/* Content */}
        <div className="z-10 flex w-full flex-col items-center text-center space-y-8 md:space-y-12 max-w-7xl">
          {/* Header Section */}
          <div className="space-y-4 px-4">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tighter max-w-4xl mx-auto leading-[1.15]">
              {title}
            </h1>
            <p className="max-w-2xl mx-auto text-white/50 text-sm md:text-lg">
              {subtitle}
            </p>
          </div>

          {/* Main Showcase Section */}
          <div className="relative w-full h-[400px] md:h-[500px] flex items-center justify-center px-4">
            {/* Carousel Wrapper */}
            <div className="relative w-full h-full flex items-center justify-center [perspective:1200px]">
              {images.map((image, index) => {
                const offset = index - currentIndex;
                const total = images.length;
                let pos = (offset + total) % total;
                if (pos > Math.floor(total / 2)) {
                  pos = pos - total;
                }

                const isCenter = pos === 0;
                const isAdjacent = Math.abs(pos) === 1;

                return (
                  <div
                    key={index}
                    className={cn(
                      'absolute w-56 h-[320px] md:w-64 md:h-[440px] transition-all duration-700 ease-in-out',
                      'flex items-center justify-center'
                    )}
                    style={{
                      transform: `
                        translateX(${(pos) * 55}%) 
                        scale(${isCenter ? 1.05 : isAdjacent ? 0.8 : 0.6})
                        rotateY(${(pos) * -14}deg)
                        translateZ(${isCenter ? 50 : 0}px)
                      `,
                      zIndex: isCenter ? 10 : isAdjacent ? 5 : 1,
                      opacity: isCenter ? 1 : isAdjacent ? 0.35 : 0,
                      filter: isCenter ? 'blur(0px)' : 'blur(5px)',
                      visibility: Math.abs(pos) > 1 ? 'hidden' : 'visible',
                    }}
                  >
                    <div className="relative w-full h-full rounded-[2.5rem] p-1.5 bg-zinc-900 border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden">
                      <img
                        src={image.src}
                        alt={image.alt}
                        className="object-cover w-full h-full rounded-[2.2rem] border border-white/5 shadow-inner"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Navigation Buttons */}
            <Button
              variant="outline"
              size="icon"
              className="absolute left-0 sm:left-4 top-1/2 -translate-y-1/2 rounded-full h-11 w-11 z-20 bg-black/40 border-white/10 text-white hover:bg-white/10 hover:text-white backdrop-blur-md"
              onClick={handlePrev}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="absolute right-0 sm:right-4 top-1/2 -translate-y-1/2 rounded-full h-11 w-11 z-20 bg-black/40 border-white/10 text-white hover:bg-white/10 hover:text-white backdrop-blur-md"
              onClick={handleNext}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    );
  }
);

HeroSection.displayName = 'HeroSection';
export { HeroSection as FeatureCarousel };
