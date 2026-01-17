import { ArrowUpRight, MapPin } from "lucide-react";

interface DestinationCardProps {
  image: string;
  title: string;
  subtitle: string;
  overlayTitle: string;
  propertyCount?: number;
  categoryId?: string;
}

const DestinationCard = ({
  image,
  title,
  subtitle,
  overlayTitle,
  propertyCount = 6,
  categoryId
}: DestinationCardProps) => {
  const handleClick = (e: React.MouseEvent) => {
    if (categoryId) {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('scrollToCategory', { detail: { categoryId } }));
    }
  };

  return (
    <a
      href="#properties"
      onClick={handleClick}
      className="group relative block overflow-hidden rounded-3xl aspect-[16/10] shadow-card hover:shadow-card-hover transition-all duration-700"
    >
      {/* Image */}
      <img
        src={image}
        alt={title}
        className="w-full h-full object-cover transition-all duration-1000 group-hover:scale-110"
        loading="lazy"
        decoding="async"
      />

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/30 to-transparent opacity-70 group-hover:opacity-80 transition-opacity duration-500" />

      {/* Content */}
      <div className="absolute inset-0 flex flex-col justify-between p-6 md:p-8">
        {/* Top Badge */}
        <div className="flex items-center gap-2 self-start px-4 py-2 bg-card/95 backdrop-blur-sm rounded-full shadow-sm">
          <MapPin className="w-4 h-4 text-primary" />
          <span className="text-foreground text-sm font-medium">
            {propertyCount}+ Properties
          </span>
        </div>

        {/* Bottom Content */}
        <div className="flex items-end justify-between">
          <div>
            <h3 className="font-display text-3xl md:text-4xl lg:text-5xl text-card font-semibold tracking-tight mb-2 transform translate-y-0 group-hover:-translate-y-1 transition-transform duration-500">
              {overlayTitle}
            </h3>
            <p className="text-card/70 text-sm md:text-base font-medium tracking-wide">
              {subtitle}
            </p>
          </div>

          {/* Arrow Button */}
          <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-primary flex items-center justify-center shadow-teal group-hover:scale-110 transition-all duration-500">
            <ArrowUpRight className="w-5 h-5 md:w-6 md:h-6 text-primary-foreground group-hover:rotate-45 transition-transform duration-300" />
          </div>
        </div>
      </div>
    </a>
  );
};

export default DestinationCard;