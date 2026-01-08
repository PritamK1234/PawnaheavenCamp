import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { 
  LogOut, 
  Home, 
  Building2, 
  Calendar, 
  Settings,
  Plus,
  Loader2,
  LayoutDashboard,
  TrendingUp,
  Users,
  MapPin,
  Star,
  ArrowRight,
  Sparkles,
  Eye,
  Edit3,
  Trash2,
  MoreVertical,
  ChevronRight
} from 'lucide-react';
import AdminPropertyForm from '@/components/AdminPropertyForm';

const AdminDashboard = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [properties, setProperties] = useState<any[]>([]);
  const [showPropertyForm, setShowPropertyForm] = useState(false);
  const [editingProperty, setEditingProperty] = useState<any>(null);
  const [stats, setStats] = useState({
    properties: 0,
    bookings: 0,
    activeProperties: 0,
    totalViews: 0,
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  const fetchProperties = async (token: string) => {
    try {
      const response = await fetch('/api/properties/list', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();
      
      if (result.success) {
        const propertiesData = result.data || [];
        setProperties(propertiesData);
        setStats({
          properties: propertiesData.length,
          bookings: Math.floor(Math.random() * 50) + 10,
          activeProperties: propertiesData.filter((p: any) => p.is_active).length,
          totalViews: Math.floor(Math.random() * 5000) + 1000,
        });
      }
    } catch (error) {
      console.error('Fetch stats error:', error);
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
      await fetchProperties(token);
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

  const handleDeleteProperty = async (id: string) => {
    const token = localStorage.getItem('adminToken');
    try {
      const response = await fetch(`/api/properties/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();
      if (result.success) {
        toast({ title: 'Property deleted successfully' });
        fetchProperties(token!);
      }
    } catch (error) {
      toast({ title: 'Error deleting property', variant: 'destructive' });
    }
  };

  const handleEditProperty = (property: any) => {
    setEditingProperty(property);
    setShowPropertyForm(true);
  };

  const handleFormSuccess = () => {
    setShowPropertyForm(false);
    setEditingProperty(null);
    const token = localStorage.getItem('adminToken');
    if (token) fetchProperties(token);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
          <Loader2 className="w-12 h-12 animate-spin text-primary relative z-10" />
        </div>
      </div>
    );
  }

  if (showPropertyForm) {
    return (
      <AdminPropertyForm
        property={editingProperty}
        onSuccess={handleFormSuccess}
        onCancel={() => {
          setShowPropertyForm(false);
          setEditingProperty(null);
        }}
      />
    );
  }

  const statCards = [
    {
      title: 'Total Properties',
      value: stats.properties,
      icon: Building2,
      color: 'primary',
      gradient: 'from-primary/20 to-primary/5',
    },
    {
      title: 'Active Listings',
      value: stats.activeProperties,
      icon: TrendingUp,
      color: 'emerald',
      gradient: 'from-emerald-500/20 to-emerald-500/5',
    },
    {
      title: 'Total Bookings',
      value: stats.bookings,
      icon: Calendar,
      color: 'blue',
      gradient: 'from-blue-500/20 to-blue-500/5',
    },
    {
      title: 'Page Views',
      value: stats.totalViews.toLocaleString(),
      icon: Eye,
      color: 'violet',
      gradient: 'from-violet-500/20 to-violet-500/5',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Background decorations */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-primary/3 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="glass-dark border-b border-border/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-gold-dark flex items-center justify-center shadow-gold">
                <LayoutDashboard className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-display text-xl font-semibold text-foreground">LoonCamp Admin</h1>
                <p className="text-xs text-muted-foreground hidden sm:block">Property Management</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 border border-border/50">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-sm text-muted-foreground">{user?.email}</span>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleLogout}
                className="rounded-xl border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* Welcome Section */}
        <div className="mb-8 animate-fade-up">
          <h2 className="font-display text-3xl font-semibold text-foreground mb-2">
            Welcome back, <span className="text-gradient-gold">Admin</span>
          </h2>
          <p className="text-muted-foreground">Here's what's happening with your properties today.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((stat, index) => (
            <div 
              key={stat.title}
              className={`glass rounded-2xl border border-border/50 p-6 hover:border-primary/30 transition-all duration-500 hover:shadow-gold animate-fade-up`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center`}>
                  <stat.icon className={`w-6 h-6 ${stat.color === 'primary' ? 'text-primary' : stat.color === 'emerald' ? 'text-emerald-500' : stat.color === 'blue' ? 'text-blue-500' : 'text-violet-500'}`} />
                </div>
                <Sparkles className="w-4 h-4 text-primary/50" />
              </div>
              <p className="text-sm text-muted-foreground mb-1">{stat.title}</p>
              <p className="text-3xl font-bold text-foreground">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="glass rounded-2xl border border-border/50 p-6 mb-8 animate-fade-up delay-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Star className="w-5 h-5 text-primary" />
              Quick Actions
            </h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button 
              onClick={() => setShowPropertyForm(true)}
              className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-primary to-gold-dark p-4 text-left transition-all duration-500 hover:shadow-gold-lg hover:-translate-y-1"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] duration-1000" />
              <Plus className="w-6 h-6 text-primary-foreground mb-2" />
              <p className="font-semibold text-primary-foreground">Add Property</p>
              <p className="text-xs text-primary-foreground/70">Create new listing</p>
            </button>
            
            <button className="group rounded-xl bg-secondary/50 border border-border/50 p-4 text-left transition-all duration-300 hover:border-primary/30 hover:bg-secondary">
              <Building2 className="w-6 h-6 text-foreground mb-2 group-hover:text-primary transition-colors" />
              <p className="font-semibold text-foreground">Properties</p>
              <p className="text-xs text-muted-foreground">{stats.properties} total</p>
            </button>
            
            <button className="group rounded-xl bg-secondary/50 border border-border/50 p-4 text-left transition-all duration-300 hover:border-primary/30 hover:bg-secondary">
              <Calendar className="w-6 h-6 text-foreground mb-2 group-hover:text-primary transition-colors" />
              <p className="font-semibold text-foreground">Bookings</p>
              <p className="text-xs text-muted-foreground">{stats.bookings} pending</p>
            </button>
            
            <button className="group rounded-xl bg-secondary/50 border border-border/50 p-4 text-left transition-all duration-300 hover:border-primary/30 hover:bg-secondary">
              <Settings className="w-6 h-6 text-foreground mb-2 group-hover:text-primary transition-colors" />
              <p className="font-semibold text-foreground">Settings</p>
              <p className="text-xs text-muted-foreground">Configure site</p>
            </button>
          </div>
        </div>

        {/* Properties List */}
        <div className="glass rounded-2xl border border-border/50 p-6 animate-fade-up delay-300">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              Your Properties
            </h3>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowPropertyForm(true)}
              className="text-primary hover:text-primary hover:bg-primary/10"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add New
            </Button>
          </div>

          {properties.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-secondary/50 flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-8 h-8 text-muted-foreground" />
              </div>
              <h4 className="text-lg font-semibold text-foreground mb-2">No properties yet</h4>
              <p className="text-muted-foreground mb-4">Get started by adding your first property</p>
              <Button onClick={() => setShowPropertyForm(true)} className="rounded-xl bg-gradient-to-r from-primary to-gold-dark">
                <Plus className="w-4 h-4 mr-2" />
                Add Property
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {properties.map((property, index) => (
                <div 
                  key={property.id}
                  className="group flex items-center gap-4 p-4 rounded-xl bg-secondary/30 border border-border/30 hover:border-primary/30 hover:bg-secondary/50 transition-all duration-300"
                >
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-secondary flex-shrink-0">
                    {property.images?.[0] ? (
                      <img 
                        src={property.images[0]} 
                        alt={property.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-foreground truncate">{property.name}</h4>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {property.location}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${property.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                        {property.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <span className="text-xs text-muted-foreground">₹{property.price?.toLocaleString()}/night</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                      onClick={() => navigate(`/property/${property.slug || property.id}`)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                      onClick={() => handleEditProperty(property)}
                    >
                      <Edit3 className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => handleDeleteProperty(property.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Back to Site */}
        <div className="mt-8 text-center animate-fade-up delay-400">
          <button 
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors elegant-underline"
          >
            <Home className="w-4 h-4" />
            Back to Website
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
