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
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);

  const displayImages =
    images && images.length > 0
      ? images.map((img) =>
          typeof img === "string" ? img : (img as any).image_url,
        )
      : [image];

  const navigationId = slug || id;

  const handleNavigate = () => {
    sessionStorage.setItem("homeScrollPosition", window.scrollY.toString());
    const unitParam = unitId ? `?unit_id=${unitId}` : '';
    navigate(`/property/${navigationId}${unitParam}`);
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const unitParam = unitId ? `?unit_id=${unitId}` : '';
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
    setCurrentImageIndex((p) => (p === 0 ? displayImages.length - 1 : p - 1));
  };

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((p) => (p === displayImages.length - 1 ? 0 : p + 1));
  };

  return (
    <div className="group cursor-pointer px-3 mb-6" onClick={handleNavigate}>
      <div className="bg-card rounded-[32px] overflow-hidden border border-border/10 hover:border-primary/30 transition-all duration-300 shadow-sm">
        {/* IMAGE */}
        <div
          ref={containerRef}
          className="relative h-64 overflow-hidden bg-black"
        >
          <OptimizedImage
            src={displayImages[currentImageIndex]}
            alt={title}
            width={400}
            priority
            className="w-full h-full"
          />

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
