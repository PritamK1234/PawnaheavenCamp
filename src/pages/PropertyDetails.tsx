import { Helmet } from "react-helmet-async";
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
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

const getIcon = (amenity: string) => {
  const a = amenity.toLowerCase();
  if (a.includes("pool") || a.includes("swim")) return <Waves className="w-5 h-5" />;
  if (a.includes("ac") || a.includes("air")) return <Wind className="w-5 h-5" />;
  if (a.includes("food") || a.includes("meal")) return <Utensils className="w-5 h-5" />;
  if (a.includes("tv") || a.includes("theatre")) return <Tv className="w-5 h-5" />;
  if (a.includes("bbq") || a.includes("fire")) return <Flame className="w-5 h-5" />;
  if (a.includes("camera")) return <Camera className="w-5 h-5" />;
  if (a.includes("parking")) return <Car className="w-5 h-5" />;
  return <ShieldCheck className="w-5 h-5 opacity-50" />;
};

interface PropertyDetail {
  id: string;
  slug: string;
  image: string;
  images: string[];
  title: string;
  price: string;
  priceNote: string;
  amenities: string[];
  location: string;
  rating: number;
  category: "camping" | "cottage" | "villa";
  description: string;
  capacity: number;
  max_capacity?: number;
  check_in_time?: string;
  check_out_time?: string;
  highlights: string[];
  activities: string[];
  policies?: string[];
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
            image: p.images?.[0]?.image_url || "https://images.unsplash.com/photo-1571508601166-972e0a1f3ced?w=1200",
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

  if (loading) return <Skeleton className="h-[400px] w-full rounded-3xl m-8" />;
  if (!propertyData) return <div className="text-center py-20">Property Not Found</div>;

  const getIcon = (amenity: string) => {
    const a = amenity.toLowerCase();
    if (a.includes("pool") || a.includes("swim")) return <Waves className="w-5 h-5" />;
    if (a.includes("ac") || a.includes("air")) return <Wind className="w-5 h-5" />;
    if (a.includes("food") || a.includes("meal")) return <Utensils className="w-5 h-5" />;
    if (a.includes("tv") || a.includes("theatre")) return <Tv className="w-5 h-5" />;
    if (a.includes("bbq") || a.includes("fire")) return <Flame className="w-5 h-5" />;
    if (a.includes("camera")) return <Camera className="w-5 h-5" />;
    if (a.includes("parking")) return <Car className="w-5 h-5" />;
    return <ShieldCheck className="w-5 h-5 opacity-50" />;
  };

  const isVilla = propertyData.category === "villa";

  // Shared booking logic to ensure consistency across views
  const handleBookingClick = () => {
    // This maintains the existing booking logic for desktop and mobile
  };

  const BookingSection = () => (
    <div className="space-y-4">
      {/* Mobile Booking Header */}
      <div className="md:hidden space-y-4">
        <div className="bg-[#1A1A1A] rounded-[2.5rem] p-6 border border-[#D4AF37]/20 shadow-2xl">
          <div className="flex flex-col mb-6">
            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-gray-400 mb-1">Total Starting At</span>
            <div className="flex items-center justify-between">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-[#D4AF37]">₹{propertyData.price}</span>
                <span className="text-gray-400 text-sm">/{isVilla ? 'villa' : 'person'}</span>
              </div>
              <Badge variant="secondary" className="bg-[#D4AF37]/10 text-[#D4AF37] border-none text-[10px] px-3 py-1.5 rounded-full">with meals</Badge>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Dialog>
              <DialogTrigger asChild>
                <Button className="flex flex-col gap-2 h-24 rounded-3xl bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90 shadow-gold">
                  <CalendarIcon className="w-6 h-6" />
                  <span className="text-[9px] uppercase font-bold tracking-widest">Book Stay</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-[2.5rem] bg-[#0A0A0A] border-[#D4AF37]/20">
                <BookingForm 
                  propertyName={propertyData.title} 
                  propertyId={propertyData.id} 
                  pricePerPerson={parseInt(propertyData.price.replace(/[^\d]/g, ""))} 
                  propertyCategory={propertyData.category} 
                  maxCapacity={propertyData.max_capacity || propertyData.capacity} 
                />
              </DialogContent>
            </Dialog>
            <Button className="flex flex-col gap-1 h-24 rounded-3xl bg-gradient-to-br from-[#00C853] via-[#00B0FF] to-[#0091EA]" onClick={() => window.open('https://wa.me/919356874010')}>
              <MessageCircle className="w-7 h-7 text-white" />
              <span className="text-[10px] font-bold text-white">WhatsApp</span>
            </Button>
            <Button variant="outline" className="flex flex-col gap-2 h-24 rounded-3xl bg-[#A855F7] border-none text-white" onClick={() => window.open(propertyData.map_link || '#')}>
              <MapPin className="w-6 h-6" />
              <span className="text-[10px] uppercase font-bold tracking-widest">Map</span>
            </Button>
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
              <Button className="h-12 rounded-xl bg-[#D4AF37] text-black text-[10px] uppercase font-bold tracking-widest px-4 shadow-gold">View Calendar</Button>
            </DialogTrigger>
            <DialogContent className="rounded-[2rem] bg-[#0A0A0A] border-[#D4AF37]/20">
              <div className="p-4"><Calendar mode="single" className="w-full" /></div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Desktop Sidebar - RESTORED LIGHT THEME SIDEBAR */}
      <Card className="hidden md:block rounded-[2.5rem] p-8 bg-card shadow-2xl border border-border/50">
        <div className="mb-8">
          <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-muted-foreground block mb-2">Total Starting At</span>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-display font-bold text-primary tracking-tight">₹{propertyData.price}</span>
            <span className="text-muted-foreground font-medium text-lg">/ {isVilla ? 'villa' : 'person'}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-3 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-green-500" />
            {propertyData.priceNote}
          </p>
        </div>
        <div className="space-y-4">
          <Dialog>
            <DialogTrigger asChild>
              <Button disabled={!propertyData.is_available} className="w-full bg-primary text-primary-foreground h-16 rounded-2xl text-lg font-bold shadow-gold hover:bg-gold-light transition-all">
                {propertyData.is_available ? "Book Your Stay" : "Currently Booked"}
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-[2rem]">
              <DialogHeader>
                <DialogTitle className="text-2xl font-display">Book Your Stay</DialogTitle>
              </DialogHeader>
              <BookingForm 
                propertyName={propertyData.title} 
                propertyId={propertyData.id} 
                pricePerPerson={parseInt(propertyData.price.replace(/[^\d]/g, ""))} 
                propertyCategory={propertyData.category} 
                maxCapacity={propertyData.max_capacity || propertyData.capacity} 
              />
            </DialogContent>
          </Dialog>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="h-16 rounded-2xl font-bold border-border/50 hover:bg-secondary transition-all" onClick={() => window.open('tel:+919356874010')}>Call Host</Button>
            <Button variant="outline" className="h-16 rounded-2xl font-bold border-border/50 hover:bg-secondary transition-all" onClick={() => window.open('https://wa.me/919356874010')}>WhatsApp</Button>
          </div>
          <Button variant="secondary" className="w-full h-16 rounded-2xl text-lg font-bold bg-blue-600 hover:bg-blue-700 text-white transition-all flex items-center justify-center gap-3 mt-2" onClick={() => window.open(propertyData.map_link || '#')}>
            <MapPin className="w-5 h-5" />
            Find us on Map
          </Button>
        </div>
      </Card>
    </div>
  );

  return (
    <>
      <Helmet>
        <title>{propertyData.title} - PawnaHavenCamp</title>
      </Helmet>

      <div className="min-h-screen bg-[#0A0A0A] md:bg-secondary/30 text-white md:text-foreground pb-12">
        <div className="relative">
          <div className="md:hidden">
            <ImageSlider images={propertyData.images.length >= 3 ? propertyData.images : [propertyData.image, propertyData.image, propertyData.image]} title={propertyData.title} className="aspect-[3/4] rounded-none" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-transparent pointer-events-none" />
          </div>
          <div className="hidden md:block container mx-auto px-6 py-8">
            <ImageSlider images={propertyData.images.length >= 1 ? propertyData.images : [propertyData.image]} title={propertyData.title} className="rounded-3xl h-[600px]" />
          </div>
          <div className="absolute top-8 left-6 right-6 flex items-center justify-between z-20">
            <Link to="/" className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center border border-white/10 text-white"><ChevronLeft className="w-6 h-6" /></Link>
            <Button variant="ghost" size="icon" className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white"><Share2 className="w-5 h-5" /></Button>
          </div>
          <div className="container mx-auto px-6 -mt-24 md:mt-0 relative z-30 md:hidden"><BookingSection /></div>
        </div>

        <div className="container mx-auto px-6 py-12">
          <div className="grid md:grid-cols-12 gap-8 items-start">
            <div className="md:col-span-8 space-y-12">
              <div className="md:hidden">
                <h1 className="text-4xl font-bold mb-4 font-display text-white">{propertyData.title}</h1>
                <p className="text-gray-400 font-light">{propertyData.description}</p>
              </div>
              <div className="hidden md:block bg-card rounded-3xl p-10 border border-border/50">
                <h1 className="text-5xl font-display font-bold mb-6">{propertyData.title}</h1>
                <p className="text-muted-foreground text-xl leading-relaxed italic">{propertyData.description}</p>
                <div className="grid grid-cols-4 gap-6 mt-12 p-8 bg-secondary/50 rounded-2xl border border-border/50">
                  <div className="flex flex-col gap-1"><Users className="w-5 h-5 text-primary" /><span className="text-[10px] uppercase font-bold text-muted-foreground">Capacity</span><span className="font-semibold">{propertyData.capacity} Guests</span></div>
                  <div className="flex flex-col gap-1"><Clock className="w-5 h-5 text-primary" /><span className="text-[10px] uppercase font-bold text-muted-foreground">Check-in</span><span className="font-semibold">{propertyData.check_in_time}</span></div>
                  <div className="flex flex-col gap-1"><Clock className="w-5 h-5 text-primary" /><span className="text-[10px] uppercase font-bold text-muted-foreground">Check-out</span><span className="font-semibold">{propertyData.check_out_time}</span></div>
                  <div className="flex flex-col gap-1"><ShieldCheck className="w-5 h-5 text-primary" /><span className="text-[10px] uppercase font-bold text-muted-foreground">Status</span><span className="font-semibold text-green-600">Verified</span></div>
                </div>
              </div>
              <section className="md:hidden">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-3"><Wifi className="w-5 h-5 text-primary" />Amenities</h3>
                <div className="flex overflow-x-auto gap-3 pb-4 scrollbar-none">{propertyData.amenities.map((a, i) => (<div key={i} className="bg-[#1A1A1A] rounded-2xl p-4 border border-gray-800/50 flex flex-col items-center min-w-[110px] text-center gap-2"><div className="text-primary">{getIcon(a)}</div><span className="text-[10px] font-bold">{a}</span></div>))}</div>
              </section>
              <section className="md:hidden">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-3"><Star className="w-5 h-5 text-primary" />Activities</h3>
                <div className="flex overflow-x-auto gap-3 pb-4 scrollbar-none">{propertyData.activities?.map((a, i) => (<div key={i} className="bg-[#1A1A1A] rounded-2xl p-3 border border-gray-800/50 flex flex-col items-center min-w-[90px] text-center gap-2"><div className="text-primary opacity-80">{getIcon(a)}</div><span className="text-[8px] font-bold text-gray-300 uppercase">{a}</span></div>))}</div>
              </section>
              <div className="hidden md:grid md:grid-cols-2 gap-8">
                <Card className="p-8 rounded-3xl"><h3 className="text-2xl font-display font-bold mb-8 flex items-center gap-3"><Wifi className="w-6 h-6 text-primary" />Amenities</h3><div className="grid gap-5">{propertyData.amenities.map((a, i) => (<div key={i} className="flex items-center gap-4"><div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">{getIcon(a)}</div><span className="text-sm font-medium">{a}</span></div>))}</div></Card>
                <Card className="p-8 rounded-3xl"><h3 className="text-2xl font-display font-bold mb-8 flex items-center gap-3"><Star className="w-6 h-6 text-primary" />Activities</h3><div className="grid gap-5">{propertyData.activities?.map((a, i) => (<div key={i} className="flex items-center gap-4"><div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">{getIcon(a)}</div><span className="text-sm font-medium">{a}</span></div>))}</div></Card>
              </div>
            </div>
            <div className="hidden md:block md:col-span-4 sticky top-24"><BookingSection /></div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PropertyDetails;
