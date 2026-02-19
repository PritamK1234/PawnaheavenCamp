import OptimizedImage from "@/components/OptimizedImage";
import { useState, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ImageSliderProps {
  images: string[];
  title: string;
  className?: string;
  aspectRatio?: string;
}

const ImageSlider = ({ images, title, className, aspectRatio }: ImageSliderProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const currentX = e.targetTouches[0].clientX;
    const diff = currentX - touchStartX.current;
    setDragOffset(diff);
  };

  const onTouchEnd = () => {
    if (touchStartX.current === null) return;
    
    if (dragOffset < -50) {
      goToNext();
    } else if (dragOffset > 50) {
      goToPrevious();
    }
    
    setDragOffset(0);
    touchStartX.current = null;
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? safeImages.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === safeImages.length - 1 ? 0 : prev + 1));
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  const safeImages = Array.isArray(images) ? images : [];

  return (
    <div 
      className={cn(
        "relative w-full bg-neutral-900 rounded-2xl overflow-hidden group",
        aspectRatio === "1:1" ? "aspect-square" : "aspect-[4/3] md:aspect-[16/9]",
        className
      )}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{ touchAction: 'pan-y' }}
    >
      {/* Main Image Strip */}
      <div 
        className="flex h-full w-full"
        style={{ 
          transform: `translateX(calc(-${currentIndex * 100}% + ${dragOffset}px))`,
          transition: touchStartX.current !== null ? 'none' : 'transform 0.4s cubic-bezier(0.2, 0, 0, 1)'
        }}
      >
        {safeImages.length > 0 ? safeImages.map((img, index) => (
          <div key={index} className="flex-shrink-0 w-full h-full relative">
            <img
              src={img}
              alt={`${title} - Image ${index + 1}`}
              className="w-full h-full object-cover"
              loading={index === 0 ? "eager" : "lazy"}
              onError={(e) => {
                console.error("Image load error:", img);
                (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1571508601166-972e0a1f3ced?w=1200";
              }}
            />
          </div>
        )) : (
          <div className="flex-shrink-0 w-full h-full bg-secondary flex items-center justify-center">
            <p className="text-muted-foreground">No images available</p>
          </div>
        )}
      </div>

      {/* Dark overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none z-10" />

      {/* Previous Button */}
      {safeImages.length > 1 && (
        <button
          className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/20 hover:bg-white/40 text-white backdrop-blur-md border border-white/30 transition-all duration-300 hover:scale-110 active:scale-95 shadow-xl z-20 flex items-center justify-center"
          onClick={goToPrevious}
          data-testid="button-slider-prev"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      {/* Next Button */}
      {safeImages.length > 1 && (
        <button
          className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/20 hover:bg-white/40 text-white backdrop-blur-md border border-white/30 transition-all duration-300 hover:scale-110 active:scale-95 shadow-xl z-20 flex items-center justify-center"
          onClick={goToNext}
          data-testid="button-slider-next"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      {/* Image Counter */}
      {safeImages.length > 1 && (
        <div className="absolute bottom-4 right-4 bg-black/60 text-white px-3 py-1.5 rounded-full text-sm font-medium" data-testid="text-image-counter">
          {currentIndex + 1} / {safeImages.length}
        </div>
      )}

      {/* Thumbnail Navigation */}
      {safeImages.length > 1 && (
        <div className="absolute bottom-4 left-4 flex gap-2">
          {safeImages.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-2.5 h-2.5 rounded-full transition-all ${
                index === currentIndex ? "bg-white w-8" : "bg-white/50 hover:bg-white/75"
              }`}
              aria-label={`Go to image ${index + 1}`}
              data-testid={`button-thumbnail-${index}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ImageSlider;