import { useNavigate } from "react-router-dom";
import {
  Star,
  MapPin,
  Share2,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import OptimizedImage from "@/components/OptimizedImage";
import { useState, useRef } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PropertyCardProps {
  id?: string;
  slug?: string;
  image: string;
  images?: string[];
  title: string;
  subtitle?: string;
  location?: string;
  price: string;
  priceNote?: string;
  rating?: number;
  amenities: string[];
  category?: string;
  isTopSelling?: boolean;
  isAvailable?: boolean;
  unitId?: number;
}

const PropertyCard = ({
  id = "1",
  slug,
  image,
  images = [],
  title,
  subtitle,
  location = "Pawna Lake",
  price,
  priceNote = "person",
  rating = 4.9,
  amenities,
  category,
  isTopSelling,
  isAvailable = true,
  unitId,
}: PropertyCardProps) => {
  const navigate = useNavigate();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isSnapping, setIsSnapping] = useState(false);

  const touchStartX = useRef<number | null>(null);
  const touchStartTime = useRef<number>(0);
  const isDragging = useRef(false);
  const didSwipe = useRef(false);

  const displayImages =
    images && images.length > 0
      ? images.map((img) =>
          typeof img === "string" ? img : (img as any).image_url,
        )
      : [image];

  const navigationId = slug || id;

  const snapTo = (index: number) => {
    const clamped = Math.max(0, Math.min(displayImages.length - 1, index));
    setIsSnapping(true);
    setCurrentImageIndex(clamped);
    setDragOffset(0);
    setTimeout(() => setIsSnapping(false), 320);
  };

  const handleNavigate = () => {
    if (didSwipe.current) {
      didSwipe.current = false;
      return;
    }
    sessionStorage.setItem("homeScrollPosition", window.scrollY.toString());
    const unitParam = unitId ? `?unit_id=${unitId}` : "";
    navigate(`/property/${navigationId}${unitParam}`);
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const unitParam = unitId ? `?unit_id=${unitId}` : "";
    const url = window.location.origin + `/property/${navigationId}${unitParam}`;
    if (navigator.share) {
      navigator.share({ title, url });
    } else {
      navigator.clipboard.writeText(url);
      alert("Link copied");
    }
  };

  const handleBookNow = (e: React.MouseEvent) => {
    e.stopPropagation();
    const phone = "+918806092609";
    const message = encodeURIComponent(
      `Hi, I'm interested in booking ${title}`,
    );
    window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    snapTo(currentImageIndex === 0 ? displayImages.length - 1 : currentImageIndex - 1);
  };

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    snapTo(currentImageIndex === displayImages.length - 1 ? 0 : currentImageIndex + 1);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartTime.current = Date.now();
    isDragging.current = true;
    didSwipe.current = false;
    setIsSnapping(false);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current || touchStartX.current === null) return;
    const delta = e.touches[0].clientX - touchStartX.current;
    setDragOffset(delta);
  };

  const onTouchEnd = () => {
    if (!isDragging.current || touchStartX.current === null) return;
    isDragging.current = false;

    const elapsed = Date.now() - touchStartTime.current;
    const velocity = Math.abs(dragOffset) / Math.max(elapsed, 1);

    if (Math.abs(dragOffset) > 40 || velocity > 0.3) {
      didSwipe.current = true;
      if (dragOffset < 0) {
        snapTo(currentImageIndex === displayImages.length - 1 ? currentImageIndex : currentImageIndex + 1);
      } else {
        snapTo(currentImageIndex === 0 ? 0 : currentImageIndex - 1);
      }
    } else {
      setIsSnapping(true);
      setDragOffset(0);
      setTimeout(() => setIsSnapping(false), 320);
    }

    touchStartX.current = null;
  };

  const stripTranslate = `calc(${-(currentImageIndex / displayImages.length) * 100}% + ${dragOffset}px)`;

  return (
    <div
      className="group cursor-pointer px-3 mb-6"
      onClick={handleNavigate}
      onMouseEnter={() => { import('../pages/PropertyDetails'); }}
    >
      <div className="bg-card rounded-[32px] overflow-hidden border border-border/10 hover:border-primary/30 transition-all duration-300 shadow-sm">
        {/* IMAGE SLIDER */}
        <div
          className="relative h-64 overflow-hidden bg-black select-none"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {/* Horizontal strip */}
          <div
            className="flex h-full"
            style={{
              width: `${displayImages.length * 100}%`,
              transform: `translateX(${stripTranslate})`,
              transition: isSnapping ? "transform 0.32s cubic-bezier(0.25, 0.46, 0.45, 0.94)" : "none",
              willChange: "transform",
            }}
          >
            {displayImages.map((src, i) => (
              <div
                key={i}
                className="h-full flex-shrink-0"
                style={{ width: `${100 / displayImages.length}%` }}
              >
                <OptimizedImage
                  src={src}
                  alt={`${title} ${i + 1}`}
                  width={400}
                  priority={i === 0}
                  className="w-full h-full"
                />
              </div>
            ))}
          </div>

          {/* NAV ARROWS */}
          {displayImages.length > 1 && (
            <div className="absolute inset-y-0 flex justify-between items-center w-full px-2 z-20">
              <button
                onClick={prevImage}
                className="p-2 bg-black/50 rounded-full text-white"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={nextImage}
                className="p-2 bg-black/50 rounded-full text-white"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}

          {/* DOT INDICATORS */}
          {displayImages.length > 1 && (
            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1 z-20 pointer-events-none">
              {displayImages.map((_, i) => (
                <div
                  key={i}
                  className="rounded-full transition-all duration-300"
                  style={{
                    width: i === currentImageIndex ? 16 : 5,
                    height: 5,
                    background: i === currentImageIndex ? "#d4af37" : "rgba(255,255,255,0.6)",
                  }}
                />
              ))}
            </div>
          )}

          {/* CONTACT BUTTONS WITH TOOLTIP */}
          <TooltipProvider>
            <div className="absolute bottom-3 right-3 flex gap-2 z-30">
              {/* SHARE */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="rounded-full w-8 h-8"
                    onClick={handleShare}
                  >
                    <Share2 size={14} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <span className="text-xs">Share</span>
                </TooltipContent>
              </Tooltip>

              {/* WHATSAPP */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    className="rounded-full w-8 h-8 bg-primary text-white"
                    onClick={handleBookNow}
                  >
                    <MessageCircle size={14} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <span className="text-xs">Chat on WhatsApp</span>
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </div>

        {/* CONTENT */}
        <div className="p-4">
          <div className="flex justify-between mb-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <MapPin size={12} />
              {location}
            </div>
            <div className="flex items-center gap-1 text-primary">
              <Star size={12} fill="currentColor" />
              {rating}
            </div>
          </div>

          <h3 className="font-semibold mb-1">{title}</h3>
          {subtitle && (
            <p className="text-xs text-primary/80 font-medium mb-2">{subtitle}</p>
          )}

          <div className="flex justify-between items-center border-t pt-3">
            <div>
              <span className="text-xl font-bold text-gradient-gold">
                ₹{price}
              </span>
              <span className="text-xs ml-1">/ {priceNote}</span>
            </div>
            <Badge variant="outline">{category}</Badge>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyCard;
