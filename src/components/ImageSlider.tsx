import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
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

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lbDragOffset, setLbDragOffset] = useState(0);
  const lbTouchStartX = useRef<number | null>(null);

  const safeImages = Array.isArray(images) ? images : [];

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    setDragOffset(e.targetTouches[0].clientX - touchStartX.current);
  };

  const onTouchEnd = () => {
    if (touchStartX.current === null) return;
    if (dragOffset < -50) goToNext();
    else if (dragOffset > 50) goToPrevious();
    setDragOffset(0);
    touchStartX.current = null;
  };

  const goToPrevious = () =>
    setCurrentIndex((prev) => (prev === 0 ? safeImages.length - 1 : prev - 1));

  const goToNext = () =>
    setCurrentIndex((prev) => (prev === safeImages.length - 1 ? 0 : prev + 1));

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false);
    setLbDragOffset(0);
    lbTouchStartX.current = null;
  }, []);

  const lbPrev = useCallback(() =>
    setLightboxIndex((prev) => (prev === 0 ? safeImages.length - 1 : prev - 1)), [safeImages.length]);

  const lbNext = useCallback(() =>
    setLightboxIndex((prev) => (prev === safeImages.length - 1 ? 0 : prev + 1)), [safeImages.length]);

  const lbTouchStart = (e: React.TouchEvent) => {
    lbTouchStartX.current = e.targetTouches[0].clientX;
  };

  const lbTouchMove = (e: React.TouchEvent) => {
    if (lbTouchStartX.current === null) return;
    setLbDragOffset(e.targetTouches[0].clientX - lbTouchStartX.current);
  };

  const lbTouchEnd = () => {
    if (lbTouchStartX.current === null) return;
    if (lbDragOffset < -50) lbNext();
    else if (lbDragOffset > 50) lbPrev();
    setLbDragOffset(0);
    lbTouchStartX.current = null;
  };

  useEffect(() => {
    if (!lightboxOpen) return;
    document.body.style.overflow = "hidden";
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") lbPrev();
      if (e.key === "ArrowRight") lbNext();
    };
    window.addEventListener("keydown", handler);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handler);
    };
  }, [lightboxOpen, closeLightbox, lbPrev, lbNext]);

  return (
    <>
      <div
        className={cn(
          "relative w-full bg-neutral-900 rounded-2xl overflow-hidden group",
          aspectRatio === "1:1" ? "aspect-square" : "aspect-[4/3] md:aspect-[16/9]",
          className
        )}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{ touchAction: "pan-y" }}
      >
        {/* Main Image Strip */}
        <div
          className="flex h-full w-full"
          style={{
            transform: `translateX(calc(-${currentIndex * 100}% + ${dragOffset}px))`,
            transition:
              touchStartX.current !== null
                ? "none"
                : "transform 0.4s cubic-bezier(0.2, 0, 0, 1)",
          }}
        >
          {safeImages.length > 0 ? (
            safeImages.map((img, index) => (
              <div
                key={index}
                className="flex-shrink-0 w-full h-full relative cursor-zoom-in"
                onClick={() => openLightbox(currentIndex)}
              >
                <img
                  src={img}
                  alt={`${title} - Image ${index + 1}`}
                  className="w-full h-full object-cover"
                  loading={index === 0 ? "eager" : "lazy"}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "https://images.unsplash.com/photo-1571508601166-972e0a1f3ced?w=1200";
                  }}
                />
              </div>
            ))
          ) : (
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
            onClick={(e) => { e.stopPropagation(); goToPrevious(); }}
            data-testid="button-slider-prev"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Next Button */}
        {safeImages.length > 1 && (
          <button
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/20 hover:bg-white/40 text-white backdrop-blur-md border border-white/30 transition-all duration-300 hover:scale-110 active:scale-95 shadow-xl z-20 flex items-center justify-center"
            onClick={(e) => { e.stopPropagation(); goToNext(); }}
            data-testid="button-slider-next"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}

        {/* Image Counter */}
        {safeImages.length > 1 && (
          <div
            className="absolute bottom-4 right-4 bg-black/60 text-white px-3 py-1.5 rounded-full text-sm font-medium z-20"
            data-testid="text-image-counter"
          >
            {currentIndex + 1} / {safeImages.length}
          </div>
        )}

        {/* Dot Navigation */}
        {safeImages.length > 1 && (
          <div className="absolute bottom-4 left-4 flex gap-2 z-20">
            {safeImages.map((_, index) => (
              <button
                key={index}
                onClick={(e) => { e.stopPropagation(); setCurrentIndex(index); }}
                className={`h-2.5 rounded-full transition-all ${
                  index === currentIndex ? "bg-white w-8" : "bg-white/50 hover:bg-white/75 w-2.5"
                }`}
                aria-label={`Go to image ${index + 1}`}
                data-testid={`button-thumbnail-${index}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Lightbox Portal */}
      {lightboxOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95"
            onClick={closeLightbox}
            onTouchStart={lbTouchStart}
            onTouchMove={lbTouchMove}
            onTouchEnd={lbTouchEnd}
            style={{ touchAction: "pan-y" }}
          >
            {/* Image — click stops propagation so backdrop click still works */}
            <img
              src={safeImages[lightboxIndex]}
              alt={`${title} - Image ${lightboxIndex + 1}`}
              className="max-h-screen max-w-full object-contain select-none"
              style={{
                transform: `translateX(${lbDragOffset}px)`,
                transition: lbTouchStartX.current !== null ? "none" : "transform 0.25s ease",
              }}
              onClick={(e) => e.stopPropagation()}
              draggable={false}
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  "https://images.unsplash.com/photo-1571508601166-972e0a1f3ced?w=1200";
              }}
            />

            {/* Close button */}
            <button
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/25 border border-white/20 text-white flex items-center justify-center backdrop-blur-md transition-all active:scale-90"
              onClick={closeLightbox}
            >
              <X className="w-5 h-5" />
            </button>

            {/* Prev arrow */}
            {safeImages.length > 1 && (
              <button
                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/25 border border-white/20 text-white flex items-center justify-center backdrop-blur-md transition-all hover:scale-110 active:scale-90"
                onClick={(e) => { e.stopPropagation(); lbPrev(); }}
              >
                <ChevronLeft className="w-7 h-7" />
              </button>
            )}

            {/* Next arrow */}
            {safeImages.length > 1 && (
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/25 border border-white/20 text-white flex items-center justify-center backdrop-blur-md transition-all hover:scale-110 active:scale-90"
                onClick={(e) => { e.stopPropagation(); lbNext(); }}
              >
                <ChevronRight className="w-7 h-7" />
              </button>
            )}

            {/* Counter */}
            {safeImages.length > 1 && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/60 text-white px-4 py-1.5 rounded-full text-sm font-medium backdrop-blur-md">
                {lightboxIndex + 1} / {safeImages.length}
              </div>
            )}

            {/* Dot indicators */}
            {safeImages.length > 1 && safeImages.length <= 12 && (
              <div className="absolute bottom-14 left-1/2 -translate-x-1/2 flex gap-1.5">
                {safeImages.map((_, i) => (
                  <button
                    key={i}
                    onClick={(e) => { e.stopPropagation(); setLightboxIndex(i); }}
                    className={`h-1.5 rounded-full transition-all ${
                      i === lightboxIndex ? "bg-white w-5" : "bg-white/40 w-1.5"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>,
          document.body
        )}
    </>
  );
};

export default ImageSlider;
