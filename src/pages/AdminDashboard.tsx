import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { 
  LogOut, 
  Home, 
  Building2, 
  Calendar, 
  Plus,
  Loader2,
  LayoutDashboard,
  TrendingUp,
  MapPin,
  Star,
  ArrowRight,
  Sparkles,
  Eye,
  Edit3,
  Trash2,
  ChevronRight,
  MessageSquare,
  Phone,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Users2,
  Share2,
  CreditCard,
  User,
  History,
  ArrowUpRight,
  Filter,
  ArrowDownLeft,
  Bell
} from 'lucide-react';
import AdminPropertyForm from '@/components/AdminPropertyForm';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from '@/lib/utils';

const AdminDashboard = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [properties, setProperties] = useState<any[]>([]);
  const [categorySettings, setCategorySettings] = useState<any[]>([]);
  const [showPropertyForm, setShowPropertyForm] = useState(false);
  const [editingProperty, setEditingProperty] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('properties');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [ownerSearchTerm, setOwnerSearchTerm] = useState('');
  const [referralSubTab, setReferralSubTab] = useState('all');
  const [transactionSubTab, setTransactionSubTab] = useState('all');
  const [referralUsers, setReferralUsers] = useState<any[]>([]);
  const [isReferralLoading, setIsReferralLoading] = useState(false);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  const fetchReferralUsers = async () => {
    const token = localStorage.getItem('adminToken');
    if (!token) return;
    setIsReferralLoading(true);
    try {
      const response = await fetch('/api/referrals/admin/all', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.status === 401) {
        handleLogout();
        return;
      }
      const result = await response.json();
      setReferralUsers(Array.isArray(result) ? result : []);
    } catch (error) {
      console.error('Fetch referrals error:', error);
      setReferralUsers([]);
    } finally {
      setIsReferralLoading(false);
    }
  };

  const fetchData = async (token: string) => {
    try {
      const [propRes, settingsRes] = await Promise.all([
        fetch('/api/properties/list', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/properties/settings/categories', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);
      
      if (propRes.status === 401 || settingsRes.status === 401) {
        handleLogout();
        return;
      }

      const propResult = await propRes.json();
      const settingsResult = await settingsRes.json();
      
      if (propResult.success) {
        setProperties(propResult.data || []);
      }
      if (settingsResult.success) {
        setCategorySettings(settingsResult.data || []);
      }
      
      // Also fetch referral users
      fetchReferralUsers();
    } catch (error) {
      console.error('Fetch error:', error);
    }
  };

  const handleUpdateReferralStatus = async (userId: number, status: string) => {
    const token = localStorage.getItem('adminToken');
    try {
      const response = await fetch('/api/referrals/admin/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ userId, status })
      });
      const result = await response.json();
      if (result.id) {
        toast({ title: 'Status updated successfully' });
        fetchReferralUsers();
      }
    } catch (error) {
      toast({ title: 'Failed to update status', variant: 'destructive' });
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('adminToken');
      const adminData = localStorage.getItem('adminUser');
      
      if (!token || !adminData) {
        navigate('/admin/login');
        return;
      }

      setUser(JSON.parse(adminData));
      await fetchData(token);
      setIsLoading(false);
    };

    checkAuth();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    toast({
      title: 'Logged out',
      description: 'You have been signed out successfully.',
    });
    navigate('/admin/login');
  };

  const handleToggleCategory = async (category: string, isClosed: boolean) => {
    let reason = '';
    let closedFrom = '';

    if (!isClosed) {
      const r = window.prompt('Enter Closure Reason:', 'Maintenance');
      if (r === null) return;
      reason = r;
      
      const d = window.prompt('Enter Closure Date/Period (e.g., 10th Jan):', '');
      if (d === null) return;
      closedFrom = d;
    }
    
    const token = localStorage.getItem('adminToken');
    try {
      const response = await fetch(`/api/properties/settings/categories/${category}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          is_closed: !isClosed,
          closed_reason: reason,
          closed_from: closedFrom,
          closed_to: closedFrom
        })
      });
      const result = await response.json();
      if (result.success) {
        fetchData(token!);
        toast({ title: `Category ${!isClosed ? 'closed' : 'opened'} successfully` });
      }
    } catch (error) {
      toast({ title: 'Failed to update category status', variant: 'destructive' });
    }
  };

  const handleDeleteProperty = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this property?')) return;
    
    const token = localStorage.getItem('adminToken');
    try {
      const response = await fetch(`/api/properties/delete/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();
      if (result.success) {
        toast({ title: 'Property deleted successfully' });
        fetchData(token!);
      }
    } catch (error) {
      toast({ title: 'Error deleting property', variant: 'destructive' });
    }
  };

  const handleToggleStatus = async (id: number, field: string, currentValue: boolean) => {
    const token = localStorage.getItem('adminToken');
    try {
      const response = await fetch(`/api/properties/toggle-status/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ field, value: !currentValue })
      });
      const result = await response.json();
      if (result.success) {
        fetchData(token!);
        toast({ title: 'Status updated successfully' });
      }
    } catch (error) {
      toast({ title: 'Failed to update status', variant: 'destructive' });
    }
  };

  const filteredProperties = properties.filter(p => {
    const matchesCategory = activeCategory === 'all' || p.category.toLowerCase() === activeCategory.toLowerCase();
    const title = p.title || '';
    const location = p.location || '';
    const matchesSearch = title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          location.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const campingCount = properties.filter(p => p.category?.toLowerCase() === 'camping').length;
  const cottageCount = properties.filter(p => p.category?.toLowerCase() === 'cottage').length;
  const villaCount = properties.filter(p => p.category?.toLowerCase() === 'villa').length;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-charcoal">
        <Loader2 className="w-12 h-12 animate-spin text-gold" />
      </div>
    );
  }

  if (showPropertyForm) {
    return (
      <AdminPropertyForm
        property={editingProperty}
        onSuccess={() => {
          setShowPropertyForm(false);
          setEditingProperty(null);
          fetchData(localStorage.getItem('adminToken')!);
        }}
        onCancel={() => {
          setShowPropertyForm(false);
          setEditingProperty(null);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-charcoal text-foreground pb-24">
      {/* Header (KEEP AS IS) */}
      <header className="glass-dark border-b border-white/5 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-gold flex items-center justify-center shadow-gold shrink-0">
              <LayoutDashboard className="w-4 h-4 sm:w-5 sm:h-5 text-black" />
            </div>
            <h1 className="font-display text-sm sm:text-xl font-semibold text-foreground truncate max-w-[120px] sm:max-w-none">PawnaHaven Admin</h1>
          </div>
          <div className="flex items-center gap-1 sm:gap-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="w-8 h-8 sm:w-10 sm:h-10 text-gold hover:text-gold-light hover:bg-gold/10 relative">
                  <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-charcoal animate-pulse" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 bg-charcoal/95 border-white/10 text-white rounded-2xl backdrop-blur-xl mt-2 shadow-2xl">
                <div className="p-4">
                  <h3 className="font-bold text-lg mb-2 text-gold">Notifications</h3>
                  <div className="space-y-3">
                    <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                      <p className="text-sm font-medium">System Alert</p>
                      <p className="text-xs text-white/50">Server is running smoothly.</p>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            <Button variant="ghost" size="icon" className="w-8 h-8 sm:w-10 sm:h-10 text-gold hover:text-gold-light hover:bg-gold/10" onClick={() => window.open('tel:+918806092609')}>
              <Phone className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="w-8 h-8 sm:w-10 sm:h-10 text-gold hover:text-gold-light hover:bg-gold/10" onClick={() => window.open('https://wa.me/918806092609')}>
              <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout} className="rounded-xl h-8 sm:h-10 text-[10px] sm:text-sm px-2 sm:px-4 border-gold/30 text-gold hover:bg-gold hover:text-black">
              <LogOut className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
              <span className="hidden xs:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Top Summary Boxes (Only show for Properties tab) */}
        {activeTab === 'properties' && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6 animate-in fade-in slide-in-from-top-2">
            <div className="glass-dark rounded-2xl border border-white/5 p-4 flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 rounded-lg bg-gold/10 text-gold">
                  <Building2 className="w-4 h-4" />
                </div>
                <p className="text-[10px] xs:text-xs text-muted-foreground uppercase tracking-wider font-semibold">Total</p>
              </div>
              <p className="text-xl xs:text-2xl font-bold text-foreground">{properties.length}</p>
            </div>

            {categorySettings.map(setting => {
              const count = setting.category === 'camping' ? campingCount : 
                           setting.category === 'cottage' ? cottageCount : villaCount;
              return (
                <div key={setting.category} className={cn(
                  "glass-dark rounded-2xl border border-white/5 p-4 flex flex-col justify-center relative overflow-hidden",
                  setting.is_closed && "opacity-50 grayscale"
                )}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-gold/10 text-gold">
                        {setting.category === 'camping' ? <Home className="w-4 h-4" /> : 
                         setting.category === 'cottage' ? <Sparkles className="w-4 h-4" /> : <Star className="w-4 h-4" />}
                      </div>
                      <p className="text-[10px] xs:text-xs text-muted-foreground uppercase tracking-wider font-semibold truncate max-w-[60px]">{setting.category}</p>
                    </div>
                    <Badge variant={setting.is_closed ? "destructive" : "outline"} className="text-[8px] h-4 px-1 border-gold/20 text-gold">
                      {count}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xl xs:text-2xl font-bold text-foreground">{count}</p>
                    <button 
                      onClick={() => handleToggleCategory(setting.category, setting.is_closed)}
                      className={cn(
                        "p-1 rounded-md transition-colors",
                        setting.is_closed ? "bg-red-500/20 text-red-500" : "bg-emerald-500/20 text-emerald-500"
                      )}
                    >
                      {setting.is_closed ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'properties' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2 font-display italic">
                  <div className="w-1.5 h-6 bg-gold rounded-full" />
                  Properties Management
                </h3>
                <Button onClick={() => setShowPropertyForm(true)} className="rounded-xl bg-gradient-gold text-black hover:opacity-90 transition-all font-semibold h-9 px-4">
                  <Plus className="w-4 h-4 mr-1.5" />
                  New
                </Button>
              </div>

              <div className="flex flex-col gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search name or location..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-11 rounded-xl bg-white/5 border-white/10 focus:border-gold/50 transition-all text-sm"
                  />
                </div>
                <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">
                  <TabsList className="bg-white/5 p-1 rounded-xl w-full border border-white/5">
                    {['all', 'camping', 'cottage', 'villa'].map(cat => (
                      <TabsTrigger 
                        key={cat} 
                        value={cat} 
                        className="rounded-lg flex-1 text-[10px] xs:text-xs capitalize data-[state=active]:bg-gold data-[state=active]:text-black"
                      >
                        {cat}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {filteredProperties.map((property) => (
                <Dialog key={property.id}>
                  <DialogTrigger asChild>
                    <div className="group glass-dark rounded-2xl border border-white/5 p-3 hover:border-gold/30 transition-all cursor-pointer active:scale-[0.98]">
                      <div className="flex gap-4">
                        <div className="w-24 h-24 rounded-xl overflow-hidden bg-white/5 flex-shrink-0 border border-white/5">
                          {property.images?.[0] ? (
                            <img src={property.images[0].image_url || property.images[0]} alt="" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center"><Building2 className="w-6 h-6 text-white/20" /></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <Badge variant="outline" className="text-[9px] h-4.5 px-1.5 border-gold/20 text-gold bg-gold/5 font-medium capitalize">{property.category}</Badge>
                              <div className="flex items-center gap-1">
                                <Star className="w-2.5 h-2.5 text-gold fill-gold" />
                                <span className="text-[10px] font-bold text-gold">{property.rating}</span>
                              </div>
                            </div>
                            <h4 className="font-semibold text-foreground truncate text-sm xs:text-base leading-snug">{property.title}</h4>
                            {property.units && property.units.length > 0 && (
                              <div className="flex items-center gap-1 text-[10px] mt-1">
                                <span className="text-[#00FF41] font-bold">
                                  {property.units.reduce((acc: number, u: any) => acc + (parseInt(u.available_persons) || 0), 0)}
                                </span>
                                <span className="text-white/40">/</span>
                                <span className="text-[#FFA500] font-bold">
                                  {property.units.reduce((acc: number, u: any) => acc + (parseInt(u.total_persons) || 0), 0)}
                                </span>
                              </div>
                            )}
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-1">
                              <MapPin className="w-3 h-3 text-gold/60" />
                              <span className="truncate">{property.location}</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between border-t border-white/5 pt-2 mt-2">
                            <span className="font-bold text-gold text-sm xs:text-base">₹{property.price}</span>
                            <div className="flex items-center gap-2">
                              <div className={cn("w-2 h-2 rounded-full", property.is_active ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-red-500")} />
                              <ChevronRight className="w-4 h-4 text-white/20" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl w-[95vw] rounded-3xl bg-charcoal border-white/10 p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
                    <DialogHeader className="sr-only">
                      <DialogTitle>{property.title} Details</DialogTitle>
                      <DialogDescription>View detailed information about {property.title}</DialogDescription>
                    </DialogHeader>
                    <div className="relative aspect-video w-full">
                      {property.images?.[0] ? (
                         <img src={property.images[0].image_url || property.images[0]} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-white/5 flex items-center justify-center"><Building2 className="w-12 h-12 text-white/20" /></div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-transparent to-transparent" />
                      <div className="absolute bottom-4 left-4 right-4">
                         <Badge className="bg-gold text-black mb-2 hover:bg-gold-light">{property.category}</Badge>
                         <h2 className="text-xl md:text-2xl font-bold font-display text-white">{property.title}</h2>
                      </div>
                    </div>
                    
                    <div className="p-6 space-y-6">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex flex-col gap-1">
                          <span className="text-muted-foreground uppercase text-[10px] tracking-widest font-bold">Location</span>
                          <span className="flex items-center gap-1.5 text-white font-medium"><MapPin className="w-3.5 h-3.5 text-gold" /> {property.location}</span>
                        </div>
                        <div className="flex flex-col gap-1 items-end">
                          <span className="text-muted-foreground uppercase text-[10px] tracking-widest font-bold">Rating</span>
                          <span className="flex items-center gap-1.5 text-white font-medium"><Star className="w-3.5 h-3.5 text-gold fill-gold" /> {property.rating}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
                           <span className="text-[10px] text-muted-foreground uppercase block mb-1">Property ID</span>
                           <span className="text-sm font-mono font-bold text-gold">{property.property_id}</span>
                        </div>
                        <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
                           <span className="text-[10px] text-muted-foreground uppercase block mb-1">Price</span>
                           <span className="text-lg font-bold text-gold">₹{property.price}</span>
                        </div>
                      </div>

                      <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] text-muted-foreground uppercase block">Booked Dates (Availability)</span>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" className="h-7 text-[10px] border-gold/30 text-gold hover:bg-gold/10">
                                <Calendar className="w-3 h-3 mr-1" />
                                Manage Calendar
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[400px] rounded-[2rem] bg-[#0A0A0A] border-[#C5A021]/20">
                              <DialogHeader>
                                <DialogTitle className="text-xl font-display text-gold">Manage Availability</DialogTitle>
                                <DialogDescription className="text-xs text-gray-400">
                                  Select a date to toggle its availability status for this property.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="p-4">
                                <CalendarComponent
                                  mode="single"
                                  className="w-full bg-transparent"
                                  onSelect={async (date) => {
                                    if (!date) return;
                                    const dateKey = format(date, 'yyyy-MM-dd');
                                    const currentAvail = Array.isArray(property.availability) ? property.availability : [];
                                    const isBooked = currentAvail.includes(dateKey);
                                    
                                    const newAvail = isBooked 
                                      ? currentAvail.filter((d: string) => d !== dateKey)
                                      : [...currentAvail, dateKey];
                                    
                                    const token = localStorage.getItem('adminToken');
                                    try {
                                      const response = await fetch(`/api/properties/update/${property.id}`, {
                                        method: 'PUT',
                                        headers: { 
                                          'Content-Type': 'application/json',
                                          'Authorization': `Bearer ${token}`
                                        },
                                        body: JSON.stringify({ availability: newAvail })
                                      });
                                      if (response.ok) {
                                        toast({ title: isBooked ? 'Date unblocked' : 'Date blocked' });
                                        fetchData(token!);
                                      }
                                    } catch (error) {
                                      toast({ title: 'Update failed', variant: 'destructive' });
                                    }
                                  }}
                                  modifiers={{
                                    booked: (date) => {
                                      const key = format(date, 'yyyy-MM-dd');
                                      return Array.isArray(property.availability) && property.availability.includes(key);
                                    }
                                  }}
                                  modifiersClassNames={{
                                    booked: "bg-red-500/20 text-red-500 line-through"
                                  }}
                                  classNames={{
                                    day_today: "bg-gold text-black",
                                    day_selected: "bg-gold text-black hover:bg-gold hover:text-black",
                                  }}
                                />
                                <p className="text-[10px] text-white/40 mt-4 text-center italic">Click a date to toggle its booking status</p>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {Array.isArray(property.availability) && property.availability.length > 0 ? (
                            property.availability.map((date: string) => (
                              <Badge key={date} variant="outline" className="text-[9px] px-1.5 py-0 border-red-500/30 text-red-400 bg-red-500/5">
                                {date}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-[10px] text-white/30 italic">No booked dates</span>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h5 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Status & Actions</h5>
                        <div className="grid grid-cols-2 gap-2">
                          <Button 
                            variant="outline" 
                            className={cn(
                              "h-11 rounded-xl text-xs font-bold border-white/10",
                              property.is_active ? "text-emerald-500 bg-emerald-500/10" : "text-red-500 bg-red-500/10"
                            )}
                            onClick={(e) => { e.stopPropagation(); handleToggleStatus(property.id, 'is_active', property.is_active); }}
                          >
                            {property.is_active ? <CheckCircle2 className="w-4 h-4 mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
                            {property.is_active ? 'Active' : 'Inactive'}
                          </Button>
                          <Button 
                            variant="outline" 
                            className={cn(
                              "h-11 rounded-xl text-xs font-bold border-white/10",
                              property.is_available ? "text-blue-500 bg-blue-500/10" : "text-orange-500 bg-orange-500/10"
                            )}
                            onClick={(e) => { e.stopPropagation(); handleToggleStatus(property.id, 'is_available', property.is_available); }}
                          >
                            <Calendar className="w-4 h-4 mr-2" />
                            {property.is_available ? 'Available' : 'Booked'}
                          </Button>
                        </div>
                        <div className="flex gap-2">
                           <Button variant="outline" className="flex-1 rounded-xl h-11 border-white/10 text-white font-bold" onClick={() => { setEditingProperty(property); setShowPropertyForm(true); }}>
                             <Edit3 className="w-4 h-4 mr-2 text-gold" /> Edit
                           </Button>
                           <Button variant="outline" className="flex-1 rounded-xl h-11 border-white/10 text-red-500 hover:bg-red-500/10 font-bold" onClick={() => handleDeleteProperty(property.id)}>
                             <Trash2 className="w-4 h-4 mr-2" /> Delete
                           </Button>
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'owners' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2 font-display italic">
                <div className="w-1.5 h-6 bg-gold rounded-full" />
                Owners Directory
              </h3>
            </div>

            <div className="flex flex-col gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search owners by name..." 
                  value={ownerSearchTerm}
                  onChange={(e) => setOwnerSearchTerm(e.target.value)}
                  className="pl-9 h-11 rounded-xl bg-white/5 border-white/10 focus:border-gold/50 transition-all text-sm"
                />
              </div>
              
              <Tabs value={ownerFilter} onValueChange={setOwnerFilter} className="w-full">
                <TabsList className="bg-white/5 p-1 rounded-xl w-full border border-white/5">
                  {['all', 'camping', 'cottage', 'villa'].map(cat => (
                    <TabsTrigger key={cat} value={cat} className="rounded-lg flex-1 text-[10px] xs:text-xs capitalize data-[state=active]:bg-gold data-[state=active]:text-black">
                      {cat}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {Array.from(new Set(properties
                .filter(p => ownerFilter === 'all' || p.category === ownerFilter)
                .filter(p => (p.owner_name || '').toLowerCase().includes(ownerSearchTerm.toLowerCase()))
                .map(p => p.owner_mobile)
              )).map((mobile, idx) => {
                const ownerProp = properties.find(p => p.owner_mobile === mobile);
                const ownerProperties = properties.filter(p => p.owner_mobile === mobile);
                
                return (
                  <div key={idx} className="glass-dark rounded-2xl border border-white/5 p-4">
                    <div className="flex items-center gap-4 mb-3">
                      <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center text-gold border border-gold/20 shrink-0">
                        <User className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-white truncate text-[12px]">{ownerProp?.owner_name || `Owner ${idx + 1}`}</h4>
                        <p className="text-[10px] text-muted-foreground font-medium">{mobile || '+91 ---'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="text-emerald-500 rounded-full h-10 w-10 hover:bg-emerald-500/10 shadow-lg shadow-emerald-500/5" onClick={() => window.open(`https://wa.me/${mobile?.replace(/\D/g, '')}`)}>
                          <MessageSquare className="w-5 h-5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-blue-500 rounded-full h-10 w-10 hover:bg-blue-500/10 shadow-lg shadow-blue-500/5" onClick={() => window.open(`tel:${mobile}`)}>
                          <Phone className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-1.5 pt-3 border-t border-white/5">
                      {ownerProperties.map((p) => (
                        <div key={p.id} className="flex items-center justify-between gap-3 bg-white/5 px-3 py-1.5 rounded-xl border border-white/5 group hover:border-gold/30 transition-colors">
                          <span className="text-xs text-white font-medium truncate flex-1">{p.title}</span>
                          <Badge variant="outline" className="text-[8px] h-4 px-1.5 border-gold/20 text-gold bg-gold/5 uppercase font-bold shrink-0">
                            {p.category}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'referrals' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2 font-display italic">
                <div className="w-1.5 h-6 bg-gold rounded-full" />
                Referrals Program
              </h3>
            </div>

            <Tabs value={referralSubTab} onValueChange={setReferralSubTab} className="w-full">
              <TabsList className="bg-white/5 p-1 rounded-xl w-full border border-white/5">
                <TabsTrigger value="all" className="rounded-lg flex-1 text-[10px] data-[state=active]:bg-gold data-[state=active]:text-black">All Referrals</TabsTrigger>
                <TabsTrigger value="requests" className="rounded-lg flex-1 text-[10px] data-[state=active]:bg-gold data-[state=active]:text-black">Requests</TabsTrigger>
                <TabsTrigger value="history" className="rounded-lg flex-1 text-[10px] data-[state=active]:bg-gold data-[state=active]:text-black">History</TabsTrigger>
              </TabsList>
            </Tabs>

            {referralSubTab === 'all' && (
              <>
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search user ID or name..." 
                    className="pl-9 h-11 rounded-xl bg-white/5 border-white/10 text-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {isReferralLoading ? (
                    <div className="flex justify-center p-8">
                      <Loader2 className="w-8 h-8 animate-spin text-gold" />
                    </div>
                  ) : referralUsers.length === 0 ? (
                    <div className="text-center p-8 glass-dark rounded-2xl border border-white/5">
                      <p className="text-muted-foreground">No referral users found</p>
                    </div>
                  ) : referralUsers.filter(u => 
                      u.username.toLowerCase().includes(searchTerm.toLowerCase()) || 
                      u.mobile_number.includes(searchTerm) ||
                      u.referral_code.toLowerCase().includes(searchTerm.toLowerCase())
                    ).map((referral) => (
                    <div key={referral.id} className="glass-dark rounded-2xl border border-white/5 p-4 hover:border-gold/30 transition-all">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center text-gold">
                            <Users2 className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-white">{referral.username}</h4>
                            <p className="text-xs text-muted-foreground">{referral.mobile_number}</p>
                          </div>
                        </div>
                        <Badge variant={referral.status === 'active' ? "outline" : "destructive"} className={cn(
                          "text-[10px] uppercase tracking-wider",
                          referral.status === 'active' ? "border-emerald-500/50 text-emerald-500 bg-emerald-500/5" : ""
                        )}>
                          {referral.status}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2 mb-4">
                        <div className="p-2 rounded-xl bg-white/5 border border-white/5 text-center">
                          <p className="text-[8px] text-muted-foreground uppercase mb-0.5">Code</p>
                          <p className="text-xs font-bold text-gold">{referral.referral_code}</p>
                        </div>
                        <div className="p-2 rounded-xl bg-white/5 border border-white/5 text-center">
                          <p className="text-[8px] text-muted-foreground uppercase mb-0.5">Balance</p>
                          <p className="text-xs font-bold text-white">₹{parseFloat(referral.balance).toLocaleString('en-IN')}</p>
                        </div>
                        <div className="p-2 rounded-xl bg-white/5 border border-white/5 text-center">
                          <p className="text-[8px] text-muted-foreground uppercase mb-0.5">Referrals</p>
                          <p className="text-xs font-bold text-white">{referral.total_referrals}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-white/5">
                        <p className="text-[10px] text-muted-foreground">Joined {new Date(referral.created_at).toLocaleDateString()}</p>
                        <div className="flex gap-2">
                          {referral.status === 'active' ? (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-7 text-[10px] text-red-400 hover:text-red-300 hover:bg-red-500/10"
                              onClick={() => handleUpdateReferralStatus(referral.id, 'blocked')}
                            >
                              <XCircle className="w-3 h-3 mr-1" />
                              Block
                            </Button>
                          ) : (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-7 text-[10px] text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                              onClick={() => handleUpdateReferralStatus(referral.id, 'active')}
                            >
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Activate
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {(referralSubTab === 'requests' || referralSubTab === 'history') && (
              <div className="space-y-3">
                <div className="p-8 text-center glass-dark rounded-3xl border border-white/5">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/5 text-white/20">
                    <Share2 className="w-8 h-8" />
                  </div>
                  <h4 className="text-white font-bold mb-1">No Referrals Data</h4>
                  <p className="text-xs text-muted-foreground">No records found for the selected view.</p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2 font-display italic">
                <div className="w-1.5 h-6 bg-gold rounded-full" />
                Transactions
              </h3>
            </div>

            <Tabs value={transactionSubTab} onValueChange={setTransactionSubTab} className="w-full">
              <TabsList className="bg-white/5 p-1 rounded-xl w-full border border-white/5">
                {['all', 'bookings', 'refunds', 'withdrawals'].map(tab => (
                  <TabsTrigger key={tab} value={tab} className="rounded-lg flex-1 text-[10px] capitalize data-[state=active]:bg-gold data-[state=active]:text-black">
                    {tab}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <div className="space-y-3">
              {/* Mock transactions based on layout requirements */}
              {[1, 2, 3].map((item) => (
                <div key={item} className="glass-dark rounded-2xl border border-white/5 p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center border border-white/5",
                      item === 2 ? "bg-red-500/10 text-red-500" : "bg-emerald-500/10 text-emerald-500"
                    )}>
                      {item === 2 ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{item === 2 ? "Refund Issued" : "Booking Payment"}</h4>
                      <p className="text-[10px] text-muted-foreground">Jan 20, 2026 • #TXN-00{item}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn("font-bold text-sm", item === 2 ? "text-red-500" : "text-emerald-500")}>
                      {item === 2 ? "-" : "+"}₹{1499 * item}
                    </p>
                    <Badge variant="outline" className="text-[8px] h-4 border-white/10 text-white/40">Success</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 text-center pb-8">
          <Button variant="ghost" onClick={() => navigate('/')} className="text-muted-foreground hover:text-gold transition-colors text-xs font-medium">
            <Home className="w-4 h-4 mr-2" />
            Back to Website
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </main>

      {/* Fixed Bottom Tab Bar (Mobile-First) */}
      <nav className="fixed bottom-0 left-0 right-0 glass-dark border-t border-white/10 px-4 py-2 z-50 md:max-w-md md:mx-auto md:mb-6 md:rounded-2xl md:border shadow-2xl backdrop-blur-2xl">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          {[
            { id: 'properties', icon: Building2, label: 'Properties' },
            { id: 'owners', icon: Users2, label: 'Owners' },
            { id: 'referrals', icon: Share2, label: 'Referrals' },
            { id: 'transactions', icon: CreditCard, label: 'Transactions' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex flex-col items-center gap-1 p-2 rounded-xl transition-all relative flex-1",
                activeTab === tab.id ? "text-gold" : "text-muted-foreground hover:text-white/60"
              )}
            >
              <tab.icon className={cn("w-5 h-5 transition-transform", activeTab === tab.id && "scale-110")} />
              <span className="text-[9px] font-bold uppercase tracking-tighter">{tab.label}</span>
              {activeTab === tab.id && (
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-1 bg-gold rounded-full shadow-gold" />
              )}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default AdminDashboard;
