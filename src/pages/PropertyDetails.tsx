import { Helmet } from "react-helmet-async";
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { 
  Star, 
  MapPin, 
  Users, 
  Wifi, 
  Wind, 
  Coffee, 
  ChevronLeft, 
  Calendar as CalendarIcon, 
  Phone, 
  Share2, 
  MessageCircle,
  Waves,
  Utensils,
  Tv,
  Flame,
  Camera,
  Waves as Water,
  Sun,
  ShieldCheck,
  Clock,
  Car
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import ImageSlider from "@/components/ImageSlider";
import { BookingForm } from "@/components/BookingForm";
import { propertyAPI } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

// Helper for mapping icons
const getIcon = (amenity: string) => {
  const a = amenity.toLowerCase();
  if (a.includes("pool") || a.includes("swim")) return <Waves className="w-5 h-5" />;
  if (a.includes("ac") || a.includes("air")) return <Wind className="w-5 h-5" />;
  if (a.includes("food") || a.includes("meal") || a.includes("breakfast") || a.includes("dining")) return <Utensils className="w-5 h-5" />;
  if (a.includes("theatre") || a.includes("tv") || a.includes("projector")) return <Tv className="w-5 h-5" />;
  if (a.includes("bbq") || a.includes("bonfire") || a.includes("fire")) return <Flame className="w-5 h-5" />;
  if (a.includes("photo")) return <Camera className="w-5 h-5" />;
  if (a.includes("hike") || a.includes("walk") || a.includes("trail")) return <MapPin className="w-5 h-5" />;
  if (a.includes("boat")) return <Water className="w-5 h-5" />;
  if (a.includes("yoga") || a.includes("meditation") || a.includes("wellness")) return <Sun className="w-5 h-5" />;
  if (a.includes("parking")) return <Car className="w-5 h-5" />;
  if (a.includes("washroom") || a.includes("toilet")) return <ShieldCheck className="w-5 h-5" />;
  if (a.includes("fridge")) return <Coffee className="w-5 h-5" />;
  return <ShieldCheck className="w-5 h-5 opacity-50" />;
};

// Extended property interface with full details
interface PropertyDetail {
  id: string;
  slug: string;
  image: string;
  images: string[];
  title: string;
  price: string;
  pricePerNight?: string;
  priceNote: string;
  amenities: string[];
  is_top_selling: boolean;
  location: string;
  rating: number;
  category: "camping" | "cottage" | "villa";
  description: string;
  capacity: number;
  max_capacity?: number;
  maxCapacity?: number;
  check_in_time?: string;
  check_out_time?: string;
  highlights: string[];
  activities: string[];
  policies?: string[];
  contact?: string;
  owner_mobile?: string;
  map_link?: string;
  is_available: boolean;
}

const PropertyDetails = () => {
  const { propertyId } = useParams();
  const [propertyData, setPropertyData] = useState<PropertyDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });

    const fetchProperty = async () => {
      try {
        if (!propertyId) return;
        const response = await propertyAPI.getPublicBySlug(propertyId);
        if (response.success) {
          const p = response.data;
          setPropertyData({
            ...p,
            priceNote: p.price_note,
            is_available: p.is_available,
            map_link: p.map_link,
            image: p.images && p.images.length > 0 ? p.images[0].image_url : "https://images.unsplash.com/photo-1571508601166-972e0a1f3ced?w=1200",
            images: p.images ? p.images.map((img: any) => img.image_url) : []
          });
        }
      } catch (error) {
        console.error("Failed to fetch property details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProperty();
  }, [propertyId]);

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-12 space-y-8">
        <Skeleton className="h-[400px] w-full rounded-3xl" />
        <div className="grid lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-6">
            <Skeleton className="h-12 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      </div>
    );
  }

  if (!propertyData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-3xl font-display font-bold mb-4">Property Not Found</h2>
        <p className="text-muted-foreground mb-8">The property you're looking for might have been moved or is no longer active.</p>
        <Link to="/">
          <Button size="lg">Return Home</Button>
        </Link>
      </div>
    );
  }

  const isVilla = propertyData.category === "villa";

  const BookingSection = () => (
    <div className="space-y-4">
      {/* Mobile-only view */}
      <div className="md:hidden space-y-4">
        <div className="bg-[#1A1A1A] rounded-[2.5rem] p-6 border border-[#D4AF37]/20 shadow-2xl relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex flex-col mb-6">
              <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-gray-400 mb-1">Total Starting At</span>
              <div className="flex items-center justify-between">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-[#D4AF37]">₹{propertyData.price}</span>
                  <span className="text-gray-400 text-sm">/{isVilla ? 'villa' : 'person'}</span>
                </div>
                <Badge variant="secondary" className="bg-[#D4AF37]/10 text-[#D4AF37] border-none text-[10px] flex items-center gap-1.5 px-3 py-1.5 rounded-full">
                  <div className="w-2 h-2 bg-[#D4AF37] rotate-45" />
                  with meals
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-3 mb-8">
              <Badge variant="outline" className="bg-black/40 border-gray-800 text-gray-400 px-4 py-2 rounded-xl text-[10px] uppercase font-bold tracking-widest">{propertyData.category}</Badge>
              <Badge className={cn(
                "border-none px-4 py-2 rounded-xl text-[10px] uppercase font-bold tracking-widest",
                propertyData.is_available ? "bg-[#00FF41]/10 text-[#00FF41]" : "bg-[#FF4500]/10 text-[#FF4500]"
              )}>
                {propertyData.is_available ? "Available" : "Booked"}
              </Badge>
              <div className="flex items-center gap-1.5 ml-auto">
                <Star className="w-4 h-4 text-[#D4AF37] fill-[#D4AF37]" />
                <span className="text-sm font-bold text-white">{propertyData.rating}</span>
                <span className="text-gray-500 text-xs">(86)</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="flex flex-col gap-2 h-24 rounded-3xl bg-[#D4AF37] border-none hover:bg-[#B8860B] transition-all group active:scale-95 shadow-gold">
                    <CalendarIcon className="w-6 h-6 text-black group-hover:scale-110 transition-transform" />
                    <span className="text-[9px] uppercase font-bold tracking-widest text-black">Book Stay</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px] rounded-[2.5rem] bg-[#0A0A0A] border-[#D4AF37]/20">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-display text-[#D4AF37]">Book Your Stay</DialogTitle>
                  </DialogHeader>
                  <BookingForm 
                    propertyName={propertyData.title} 
                    propertyId={propertyData.id}
                    pricePerPerson={parseInt(propertyData.price.replace(/[^\d]/g, "")) || 0}
                    propertyCategory={propertyData.category}
                    maxCapacity={propertyData.max_capacity || propertyData.capacity}
                  />
                </DialogContent>
              </Dialog>

              <Button 
                className="flex flex-col gap-1 h-24 rounded-3xl bg-gradient-to-br from-[#00C853] via-[#00B0FF] to-[#0091EA] border-none shadow-[0_10px_30px_rgba(0,176,255,0.3)] group overflow-hidden relative active:scale-95 transition-all"
                onClick={() => window.open(`https://api.whatsapp.com/send?phone=919356874010`, '_blank')}
              >
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <MessageCircle className="w-7 h-7 text-white" />
                <span className="text-[10px] font-bold text-white">Call / WhatsApp</span>
              </Button>

              <Button 
                variant="outline" 
                className="flex flex-col gap-2 h-24 rounded-3xl bg-[#A855F7] border-none shadow-[0_10px_30px_rgba(168,85,247,0.3)] hover:bg-[#9333EA] text-white transition-all active:scale-95"
                onClick={() => window.open(propertyData.map_link || 'https://www.google.com/maps', '_blank')}
              >
                <MapPin className="w-6 h-6" />
                <span className="text-[10px] uppercase font-bold tracking-widest">Map</span>
              </Button>
            </div>
          </div>
        </div>

        <div className="bg-[#1A1A1A] rounded-[2.5rem] p-5 border border-[#D4AF37]/10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-black flex items-center justify-center border border-[#D4AF37]/20">
              <CalendarIcon className="w-5 h-5 text-[#D4AF37]" />
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-widest font-bold text-[#D4AF37]">Availability</p>
              <p className="text-lg font-bold text-white">Check Dates</p>
            </div>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="h-12 rounded-xl bg-[#D4AF37] border-none text-black text-[10px] uppercase font-bold tracking-widest px-4 hover:bg-[#B8860B] shadow-gold">
                View Calendar
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[400px] rounded-[2rem] bg-[#0A0A0A] border-[#D4AF37]/20">
              <div className="p-4">
                <Calendar
                  mode="single"
                  className="w-full bg-transparent"
                  classNames={{
                    day_today: "bg-[#D4AF37] text-black",
                    day_selected: "bg-[#D4AF37] text-black hover:bg-[#D4AF37] hover:text-black",
                    day_disabled: "text-gray-700 opacity-50 line-through",
                  }}
                />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Desktop view - restored previous layout */}
      <Card className="hidden md:block rounded-[2.5rem] p-8 md:p-10 bg-card shadow-2xl-soft border border-border/50 overflow-hidden relative">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative">
          <div className="mb-8">
            <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-muted-foreground block mb-2">Total Starting At</span>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-display font-bold text-primary tracking-tight">₹{propertyData.price}</span>
              <span className="text-muted-foreground font-medium text-lg">/ {isVilla ? 'villa' : 'person'}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-3 font-medium flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-green-500" />
              {propertyData.priceNote}
            </p>
          </div>

          <div className="space-y-4 mb-8">
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  disabled={!propertyData.is_available}
                  className="w-full bg-primary text-primary-foreground hover:bg-gold-light h-16 rounded-2xl text-lg font-bold shadow-gold hover:shadow-gold-lg transition-all active:scale-95 flex items-center justify-center gap-3"
                >
                  <MessageCircle className="w-6 h-6" />
                  {propertyData.is_available ? "Book Your Stay" : "Currently Booked"}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px] rounded-[2rem]">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-display">Book Your Stay</DialogTitle>
                </DialogHeader>
                <BookingForm 
                  propertyName={propertyData.title} 
                  propertyId={propertyData.id}
                  pricePerPerson={parseInt(propertyData.price.replace(/[^\d]/g, "")) || 0}
                  propertyCategory={propertyData.category}
                  maxCapacity={propertyData.max_capacity || propertyData.capacity}
                />
              </DialogContent>
            </Dialog>
            
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="h-16 rounded-2xl text-base font-bold border-border/50 hover:bg-secondary transition-all flex items-center justify-center gap-2"
                onClick={() => window.open(`tel:+919356874010`, '_self')}
              >
                <Phone className="w-4 h-4 text-primary" />
                Call Host
              </Button>
              <Button
                variant="outline"
                className="h-16 rounded-2xl text-base font-bold border-border/50 hover:bg-secondary transition-all flex items-center justify-center gap-2"
                onClick={() => window.open(`https://api.whatsapp.com/send?phone=919356874010`, '_blank')}
              >
                <MessageCircle className="w-4 h-4 text-green-500" />
                WhatsApp
              </Button>
            </div>

            <Button
              variant="secondary"
              className="w-full h-16 rounded-2xl text-lg font-bold bg-blue-600 hover:bg-blue-700 text-white transition-all flex items-center justify-center gap-3 mt-2"
              onClick={() => window.open(propertyData.map_link || 'https://www.google.com/maps', '_blank')}
            >
              <MapPin className="w-5 h-5" />
              Find us on Map
            </Button>
          </div>

          <div className="pt-8 border-t border-border/50">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-primary border border-border/50">
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Inquiry Support</p>
                <p className="font-bold text-foreground">+91 9356874010</p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );

  return (
    <>
      <Helmet>
        <title>{propertyData.title} - Luxury {propertyData.category === 'camping' ? 'Pawna Camping' : 'Lonavala Booking'} | PawnaHavenCamp</title>
        <meta name="description" content={`Book ${propertyData.title} at ${propertyData.location}. Luxury ${propertyData.category} with ${propertyData.amenities.slice(0, 5).join(', ')}. ${propertyData.description.substring(0, 100)}...`} />
        {/* Open Graph / WhatsApp Preview */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content={`${propertyData.title} - ${propertyData.category} in ${propertyData.location}`} />
        <meta property="og:description" content={`Stay at ${propertyData.title} for ${propertyData.price}. Perfect ${propertyData.category} experience near Pawna Lake & Lonavala.`} />
        <meta property="og:image" content={propertyData.image} />
        <meta property="og:url" content={window.location.href} />
      </Helmet>

      <div className="min-h-screen bg-[#0A0A0A] text-white pb-12">
        {/* Gallery Container */}
        <div className="relative">
          <div className="md:hidden">
            <div className="h-[75vh] w-full relative">
              <ImageSlider 
                images={propertyData.images && propertyData.images.length >= 3 ? propertyData.images : [
                  propertyData.image,
                  "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=1200",
                  "https://images.unsplash.com/photo-1523987355523-c7b5b0dd90a7?w=1200"
                ]} 
                title={propertyData.title} 
                className="h-full rounded-none" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-transparent pointer-events-none" />
            </div>
          </div>
          
          <div className="hidden md:block">
            <div className="h-[500px] w-full relative container mx-auto px-6 py-8">
              <ImageSlider images={propertyData.images || [propertyData.image]} title={propertyData.title} className="rounded-3xl shadow-2xl" />
            </div>
          </div>
          
          {/* Back & Share Buttons */}
          <div className="absolute top-8 left-6 right-6 flex items-center justify-between z-20">
            <Link to="/" className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center border border-white/10 text-white">
              <ChevronLeft className="w-6 h-6" />
            </Link>
            <Button 
              variant="ghost" 
              size="icon" 
              className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white"
              onClick={() => {
                const shareUrl = window.location.href;
                const text = `🏡 *${propertyData.title}*\n📍 ${propertyData.location}\n💰 *${propertyData.price}* ${propertyData.priceNote}\n\nCheck out this beautiful property on PawnaHavenCamp:\n${shareUrl}`;
                window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
              }}
            >
              <Share2 className="w-5 h-5" />
            </Button>
          </div>

          {/* Floating Booking Card (Overlapping Hero) */}
          <div className="container mx-auto px-6 -mt-24 relative z-30">
            <div className="max-w-xl mx-auto">
              <BookingSection />
            </div>
          </div>
        </div>

        <div className="container mx-auto px-6 py-12 max-w-xl">
          <div className="space-y-12">
            {/* Title Section */}
            <div>
              <h1 className="text-4xl font-bold mb-4 font-display text-white">{propertyData.title}</h1>
              <p className="text-gray-400 leading-relaxed font-light">{propertyData.description}</p>
            </div>

            {/* Feature Grid */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Capacity', value: `${propertyData.capacity} Guests`, icon: Users },
                { label: 'Check-in', value: propertyData.check_in_time || '2:00 PM', icon: Clock },
                { label: 'Check-out', value: propertyData.check_out_time || '11:00 AM', icon: Clock },
                { label: 'Status', value: 'Verified', icon: ShieldCheck, accent: 'text-[#00FF41]' }
              ].map((stat, i) => (
                <div key={i} className="bg-[#1A1A1A] rounded-2xl p-3 border border-gray-800/50 flex flex-col items-center text-center gap-1.5">
                  <stat.icon className="w-4 h-4 text-[#D4AF37]" />
                  <span className="text-[8px] uppercase font-bold text-gray-500 tracking-widest">{stat.label}</span>
                  <span className={cn("text-[9px] font-bold truncate w-full", stat.accent || "text-white")}>{stat.value}</span>
                </div>
              ))}
            </div>

            {/* Amenities */}
            <section>
              <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                <Wifi className="w-5 h-5 text-[#D4AF37]" />
                Amenities
              </h3>
              <div className="flex overflow-x-auto gap-3 pb-4 scrollbar-none -mx-2 px-2">
                {propertyData.amenities.map((amenity, index) => (
                  <div key={index} className="bg-[#1A1A1A] rounded-2xl p-4 border border-gray-800/50 flex flex-col items-center text-center gap-3 group hover:border-[#D4AF37]/30 transition-all min-w-[110px]">
                    <div className="text-[#D4AF37]">{getIcon(amenity)}</div>
                    <span className="text-[10px] font-bold text-white tracking-tight">{amenity}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Activities */}
            <section>
              <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                <Star className="w-5 h-5 text-[#D4AF37]" />
                Activities
              </h3>
              <div className="flex overflow-x-auto gap-3 pb-4 scrollbar-none -mx-2 px-2">
                {propertyData.activities?.map((activity, index) => (
                  <div key={index} className="bg-[#1A1A1A] rounded-2xl p-3 border border-gray-800/50 flex flex-col items-center text-center gap-2 min-w-[90px]">
                    <div className="text-[#D4AF37] opacity-80">{getIcon(activity)}</div>
                    <span className="text-[8px] font-bold text-gray-300 uppercase tracking-widest">{activity}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Accordions */}
            <div className="space-y-3">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="highlights" className="border-none bg-[#1A1A1A] rounded-2xl px-6 border border-gray-800/50 mb-3 overflow-hidden">
                  <AccordionTrigger className="hover:no-underline py-5 text-sm font-bold">
                    <div className="flex items-center gap-3">
                      <Star className="w-4 h-4 text-[#D4AF37]" />
                      What You'll Love
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-5">
                    <ul className="space-y-3">
                      {propertyData.highlights.map((h, i) => (
                        <li key={i} className="text-gray-400 text-sm flex items-start gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] mt-1.5 shrink-0" />
                          {h}
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="policies" className="border-none bg-[#1A1A1A] rounded-2xl px-6 border border-gray-800/50 overflow-hidden">
                  <AccordionTrigger className="hover:no-underline py-5 text-sm font-bold">
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
                      Policies
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-5">
                    <ul className="space-y-3">
                      {propertyData.policies?.map((p, i) => (
                        <li key={i} className="text-gray-400 text-sm flex items-start gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] mt-1.5 shrink-0" />
                          {p}
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PropertyDetails;
