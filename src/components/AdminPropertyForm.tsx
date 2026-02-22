import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Building2,
  Save,
  Loader2,
  Plus,
  Trash2,
  Sparkles,
  Star,
  MapPin,
  IndianRupee,
  Users,
  Clock,
  Phone,
  Upload,
  ImageIcon,
  Calendar,
  Copy,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { propertyAPI, villaAPI } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";

interface AdminPropertyFormProps {
  property?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

import { CalendarSync } from "@/components/CalendarSync";

const UnitManager = ({
  propertyId,
  category,
  units,
  onRefresh,
}: {
  propertyId: string;
  category: string;
  units: any[];
  onRefresh: () => void;
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingUnit, setEditingUnit] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [unitForm, setUnitForm] = useState({
    name: "",
    available_persons: "0",
    total_persons: "0",
    price_per_person: "0",
    weekday_price: "0",
    weekend_price: "0",
    special_price: "0",
    amenities: [""],
    images: [] as string[],
    special_dates: [] as { date: string; price: string }[],
  });
  const { toast } = useToast();

  const handleSaveUnit = async () => {
    try {
      const payload = {
        ...unitForm,
        price_per_person: String(unitForm.price_per_person),
        weekday_price: String(unitForm.weekday_price),
        weekend_price: String(unitForm.weekend_price),
        special_price: String(unitForm.special_price),
        available_persons: parseInt(unitForm.available_persons),
        total_persons: parseInt(unitForm.total_persons),
        amenities: unitForm.amenities.filter((a) => a.trim()),
        images: unitForm.images.filter((i) => i.trim()),
        special_dates: Array.isArray(unitForm.special_dates)
          ? unitForm.special_dates
          : [],
      };

      const res = editingUnit
        ? await propertyAPI.updateUnit(editingUnit.id, payload)
        : await propertyAPI.createUnit(propertyId, payload);

      if (res.success) {
        toast({ title: editingUnit ? "Unit updated" : "Unit created" });
        setIsAdding(false);
        setEditingUnit(null);
        setUnitForm({
          name: "",
          available_persons: "0",
          total_persons: "0",
          price_per_person: "0",
          weekday_price: "0",
          weekend_price: "0",
          special_price: "0",
          amenities: [""],
          images: [] as string[],
          special_dates: [] as { date: string; price: string }[],
        });
        onRefresh();
      }
    } catch (e) {
      toast({ title: "Error saving unit", variant: "destructive" });
    }
  };

  const handleUnitImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const remaining = 20 - unitForm.images.length;
    if (remaining <= 0) {
      toast({
        title: "Maximum 20 images allowed per unit",
        variant: "destructive",
      });
      return;
    }
    const filesToUpload = files.slice(0, remaining);
    if (files.length > remaining) {
      toast({
        title: `Only uploading ${remaining} image(s) to stay within the 20 limit`,
        variant: "destructive",
      });
    }

    for (const file of filesToUpload) {
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      if (!["jpg", "jpeg", "png", "webp"].includes(ext)) {
        toast({
          title: `"${file.name}" skipped — invalid format. Allowed: jpg, jpeg, png, webp`,
          variant: "destructive",
        });
        continue;
      }

      setIsUploading(true);
      const token =
        localStorage.getItem("adminToken") ||
        localStorage.getItem("ownerToken");
      const formDataUpload = new FormData();
      formDataUpload.append("image", file);

      try {
        const response = await fetch("/api/properties/upload-image", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formDataUpload,
        });

        const result = await response.json();
        if (result.success) {
          setUnitForm((prev) => ({
            ...prev,
            images: [...prev.images, result.url],
          }));
          toast({ title: "Image uploaded" });
        } else {
          toast({
            title: result.message || "Upload failed",
            variant: "destructive",
          });
        }
      } catch (error) {
        toast({ title: "Upload error", variant: "destructive" });
      }
    }
    setIsUploading(false);
    e.target.value = "";
  };

  const parseJson = (val: any) => {
    if (Array.isArray(val)) return val;
    if (typeof val === "string") {
      try {
        return JSON.parse(val);
      } catch (e) {
        return [val];
      }
    }
    return [];
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground font-display italic">
          Stay Options (Units)
        </h3>
        <Button
          type="button"
          size="sm"
          onClick={() => setIsAdding(true)}
          className="bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 h-8"
        >
          <Plus className="w-4 h-4 mr-1" /> Add Unit
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {units.map((unit) => (
          <div
            key={unit.id}
            className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-white/5 border border-white/10">
                {parseJson(unit.images)?.[0] ? (
                  <img
                    src={parseJson(unit.images)[0]}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src =
                        "https://images.unsplash.com/photo-1523755231516-e43fd2e8dca5?auto=format&fit=crop&q=80&w=400";
                    }}
                  />
                ) : (
                  <ImageIcon className="w-full h-full p-3 text-white/20" />
                )}
              </div>
              <div>
                <p className="font-bold text-white">{unit.name}</p>
                {category === "villa" ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-blue-400">Max Capacity: {unit.total_persons || 0}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${unit.has_booking ? 'text-red-400 bg-red-400/10 border border-red-400/20' : 'text-green-400 bg-green-400/10 border border-green-400/20'}`}>
                      {unit.has_booking ? 'Booked' : 'Available'}
                    </span>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    <span className="text-[#00FF41]">
                      {unit.available_persons}
                    </span>{" "}
                    / <span className="text-[#FFA500]">{unit.total_persons}</span>
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-[10px] border-gold/30 text-gold hover:bg-gold/10"
                  >
                    <Calendar className="w-3 h-3 mr-1" /> Calendar
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[450px] bg-charcoal border-white/10 rounded-3xl">
                  <DialogHeader>
                    <DialogTitle className="text-gold font-display">
                      Manage Unit Calendar: {unit.name}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                      Select dates to manage availability and pricing for this
                      unit.
                    </DialogDescription>
                  </DialogHeader>
                  <CalendarSync
                    propertyId={propertyId}
                    unitId={unit.id}
                    isAdmin={true}
                    unitName={unit.name}
                    isVilla={category === "villa"}
                  />
                </DialogContent>
              </Dialog>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => {
                  setEditingUnit(unit);
                  setUnitForm({
                    name: unit.name,
                    available_persons: (unit.available_persons || 0).toString(),
                    total_persons: (unit.total_persons || 0).toString(),
                    price_per_person: (unit.price_per_person || 0).toString(),
                    weekday_price: (unit.weekday_price || 0).toString(),
                    weekend_price: (unit.weekend_price || 0).toString(),
                    special_price: (unit.special_price || 0).toString(),
                    special_dates: parseJson(unit.special_dates) || [],
                    amenities: parseJson(unit.amenities).length
                      ? parseJson(unit.amenities)
                      : [""],
                    images: parseJson(unit.images),
                  });
                  setIsAdding(true);
                }}
                className="h-8 w-8 text-white/40 hover:text-white"
              >
                <Sparkles className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => propertyAPI.deleteUnit(unit.id).then(onRefresh)}
                className="h-8 w-8 text-red-500/40 hover:text-red-500 hover:bg-red-500/10"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog
        open={isAdding}
        onOpenChange={(open) => {
          if (!open) {
            setIsAdding(false);
            setEditingUnit(null);
          }
        }}
      >
        <DialogContent
          className="bg-charcoal border-white/10 rounded-3xl max-h-[90vh] overflow-y-auto sm:max-w-[600px]"
          aria-describedby="unit-form-desc"
        >
          <DialogHeader>
            <DialogTitle className="text-gold font-display">
              {editingUnit ? "Edit Unit" : "Add New Unit"}
            </DialogTitle>
            <p id="unit-form-desc" className="text-xs text-muted-foreground">
              Specify the details for this accommodation unit.
            </p>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="unit-name">Unit Name</Label>
                <Input
                  id="unit-name"
                  name="name"
                  value={unitForm.name}
                  onChange={(e) =>
                    setUnitForm({ ...unitForm, name: e.target.value })
                  }
                  placeholder="e.g. Deluxe Tent"
                  className="bg-white/5 border-white/10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="weekday-price">Weekday Price (Base)</Label>
                <Input
                  id="weekday-price"
                  name="weekday_price"
                  type="number"
                  value={unitForm.weekday_price}
                  onChange={(e) =>
                    setUnitForm({ ...unitForm, weekday_price: e.target.value })
                  }
                  className="bg-white/5 border-white/10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weekend-price">Weekend Price</Label>
                <Input
                  id="weekend-price"
                  name="weekend_price"
                  type="number"
                  value={unitForm.weekend_price}
                  onChange={(e) =>
                    setUnitForm({ ...unitForm, weekend_price: e.target.value })
                  }
                  className="bg-white/5 border-white/10"
                />
              </div>
              {category === "villa" ? (
                <div className="space-y-2 md:col-span-2">
                  <Label className="flex items-center gap-2">
                    <span className="text-blue-400">Max Capacity</span>
                  </Label>
                  <Input
                    id="total-persons"
                    name="total_persons"
                    type="number"
                    placeholder="Max number of guests"
                    value={unitForm.total_persons}
                    onChange={(e) =>
                      setUnitForm({
                        ...unitForm,
                        total_persons: e.target.value,
                        available_persons: e.target.value,
                      })
                    }
                    className="bg-white/5 border-white/10 text-blue-400 font-bold"
                  />
                </div>
              ) : (
                <div className="space-y-2 md:col-span-2">
                  <Label>
                    <span className="text-[#00FF41]">Available</span> /{" "}
                    <span className="text-[#FFA500]">Total persons capacity</span>
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="available-persons"
                      name="available_persons"
                      type="number"
                      placeholder="Available"
                      value={unitForm.available_persons}
                      onChange={(e) =>
                        setUnitForm({
                          ...unitForm,
                          available_persons: e.target.value,
                        })
                      }
                      className="bg-white/5 border-white/10 text-[#00FF41] font-bold"
                    />
                    <Input
                      id="total-persons"
                      name="total_persons"
                      type="number"
                      placeholder="Total"
                      value={unitForm.total_persons}
                      onChange={(e) =>
                        setUnitForm({
                          ...unitForm,
                          total_persons: e.target.value,
                        })
                      }
                      className="bg-white/5 border-white/10 text-[#FFA500] font-bold"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4 pt-4 border-t border-white/10">
              <div className="flex items-center justify-between">
                <Label className="text-gold">Special Date Prices</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setUnitForm({
                      ...unitForm,
                      special_dates: [
                        ...unitForm.special_dates,
                        { date: "", price: "" },
                      ],
                    })
                  }
                  className="bg-gold/10 border-gold/20 text-gold hover:bg-gold/20"
                >
                  + Add Date
                </Button>
              </div>
              <div className="space-y-3">
                {unitForm.special_dates.map((sd, idx) => (
                  <div
                    key={idx}
                    className="flex gap-3 items-end bg-white/5 p-3 rounded-xl"
                  >
                    <div className="flex-1 space-y-2">
                      <Label className="text-xs">Date</Label>
                      <Input
                        type="date"
                        value={sd.date}
                        onChange={(e) => {
                          const newDates = [...unitForm.special_dates];
                          newDates[idx].date = e.target.value;
                          setUnitForm({ ...unitForm, special_dates: newDates });
                        }}
                        className="bg-charcoal border-white/10"
                      />
                    </div>
                    <div className="flex-1 space-y-2">
                      <Label className="text-xs">Price</Label>
                      <Input
                        type="number"
                        value={sd.price}
                        onChange={(e) => {
                          const newDates = [...unitForm.special_dates];
                          newDates[idx].price = e.target.value;
                          setUnitForm({ ...unitForm, special_dates: newDates });
                        }}
                        placeholder="₹ 2999"
                        className="bg-charcoal border-white/10"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const newDates = unitForm.special_dates.filter(
                          (_, i) => i !== idx,
                        );
                        setUnitForm({ ...unitForm, special_dates: newDates });
                      }}
                      className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Unit Level Arrays */}
            {[{ label: "Amenities", field: "amenities" as const }].map(
              (section) => (
                <div key={section.field} className="space-y-2">
                  <Label>{section.label}</Label>
                  <div className="space-y-2">
                    {unitForm[section.field].map((val, idx) => (
                      <div key={idx} className="flex gap-2">
                        <Input
                          value={val}
                          onChange={(e) => {
                            const newArr = [...unitForm[section.field]];
                            newArr[idx] = e.target.value;
                            setUnitForm({
                              ...unitForm,
                              [section.field]: newArr,
                            });
                          }}
                          className="bg-white/5 border-white/10 h-9"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-red-500/50 hover:text-red-500"
                          onClick={() => {
                            const newArr = unitForm[section.field].filter(
                              (_, i) => i !== idx,
                            );
                            setUnitForm({
                              ...unitForm,
                              [section.field]: newArr.length ? newArr : [""],
                            });
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full border-dashed"
                      onClick={() =>
                        setUnitForm({
                          ...unitForm,
                          [section.field]: [...unitForm[section.field], ""],
                        })
                      }
                    >
                      <Plus className="w-3 h-3 mr-1" /> Add {section.label}
                    </Button>
                  </div>
                </div>
              ),
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Unit Gallery ({unitForm.images.length}/20)</Label>
                <input
                  type="file"
                  id="unit-img"
                  className="hidden"
                  onChange={handleUnitImageUpload}
                  accept=".jpg,.jpeg,.png,.webp"
                  multiple
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => document.getElementById("unit-img")?.click()}
                  disabled={isUploading || unitForm.images.length >= 20}
                >
                  {isUploading ? (
                    <Loader2 className="w-3 h-3 animate-spin mr-1" />
                  ) : (
                    <Upload className="w-3 h-3 mr-1" />
                  )}{" "}
                  Upload
                </Button>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {unitForm.images.map((img, idx) => (
                  <div
                    key={idx}
                    className="aspect-square rounded-lg overflow-hidden relative group border border-white/10"
                  >
                    <img src={img} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                      onClick={() =>
                        setUnitForm({
                          ...unitForm,
                          images: unitForm.images.filter((_, i) => i !== idx),
                        })
                      }
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <Button
              type="button"
              onClick={handleSaveUnit}
              className="w-full bg-gradient-gold text-black font-bold h-12 rounded-xl mt-4"
            >
              {editingUnit ? "Update Unit" : "Create Unit"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

interface VillaUnitFormState {
  name: string;
  description: string;
  weekday_price: string;
  weekend_price: string;
  special_price: string;
  total_persons: string;
  check_in_time: string;
  check_out_time: string;
  rating: string;
  price_note: string;
  amenities: string[];
  activities: string[];
  highlights: string[];
  policies: string[];
  schedule: { time: string; title: string }[];
  images: string[];
  special_dates: { date: string; price: string }[];
}

const createDefaultVillaUnitForm = (): VillaUnitFormState => ({
  name: "",
  description: "",
  weekday_price: "0",
  weekend_price: "0",
  special_price: "0",
  total_persons: "0",
  check_in_time: "2:00 PM",
  check_out_time: "11:00 AM",
  rating: "4.5",
  price_note: "",
  amenities: [""],
  activities: [""],
  highlights: [""],
  policies: [""],
  schedule: [{ time: "", title: "" }],
  images: [],
  special_dates: [],
});

const VillaUnitManager = ({
  propertyId,
  units,
  onRefresh,
}: {
  propertyId: string;
  units: any[];
  onRefresh: () => void;
}) => {
  const [activeUnitId, setActiveUnitId] = useState<number | null>(null);
  const [unitFormData, setUnitFormData] = useState<Record<number, VillaUnitFormState>>({});
  const [isAddingUnit, setIsAddingUnit] = useState(false);
  const [newUnitName, setNewUnitName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [calendarUnitId, setCalendarUnitId] = useState<number | null>(null);
  const [calendarUnitName, setCalendarUnitName] = useState("");
  const { toast } = useToast();

  const parseJson = (val: any): any[] => {
    if (Array.isArray(val)) return val;
    if (typeof val === "string") {
      try {
        return JSON.parse(val);
      } catch (e) {
        return val.trim() ? [val] : [];
      }
    }
    return [];
  };

  const loadUnitIntoForm = (unit: any) => {
    setUnitFormData((prev) => ({
      ...prev,
      [unit.id]: {
        name: unit.name || "",
        description: unit.description || "",
        weekday_price: (unit.weekday_price || 0).toString(),
        weekend_price: (unit.weekend_price || 0).toString(),
        special_price: (unit.special_price || 0).toString(),
        total_persons: (unit.total_persons || 0).toString(),
        check_in_time: unit.check_in_time || "2:00 PM",
        check_out_time: unit.check_out_time || "11:00 AM",
        rating: (unit.rating || 4.5).toString(),
        price_note: unit.price_note || "",
        amenities: parseJson(unit.amenities).length ? parseJson(unit.amenities) : [""],
        activities: parseJson(unit.activities).length ? parseJson(unit.activities) : [""],
        highlights: parseJson(unit.highlights).length ? parseJson(unit.highlights) : [""],
        policies: parseJson(unit.policies).length ? parseJson(unit.policies) : [""],
        schedule: parseJson(unit.schedule).length ? parseJson(unit.schedule) : [{ time: "", title: "" }],
        images: parseJson(unit.images),
        special_dates: parseJson(unit.special_dates) || [],
      },
    }));
  };

  useEffect(() => {
    units.forEach((unit) => {
      if (!unitFormData[unit.id]) {
        loadUnitIntoForm(unit);
      }
    });
    if (units.length > 0 && !activeUnitId) {
      setActiveUnitId(units[0].id);
    }
  }, [units]);

  const handleCreateUnit = async () => {
    if (!newUnitName.trim()) return;
    setIsCreating(true);
    try {
      const res = await villaAPI.createUnit(propertyId, { name: newUnitName.trim() });
      if (res.success) {
        toast({ title: "Unit created" });
        setIsAddingUnit(false);
        setNewUnitName("");
        onRefresh();
      } else {
        toast({ title: res.message || "Failed to create unit", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Error creating unit", variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteUnit = async (unitId: number) => {
    if (!confirm("Are you sure you want to delete this unit?")) return;
    try {
      const res = await villaAPI.deleteUnit(unitId);
      if (res.success) {
        toast({ title: "Unit deleted" });
        if (activeUnitId === unitId) setActiveUnitId(null);
        const newData = { ...unitFormData };
        delete newData[unitId];
        setUnitFormData(newData);
        onRefresh();
      } else {
        toast({ title: "Failed to delete unit", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Error deleting unit", variant: "destructive" });
    }
  };

  const handleSaveUnit = async () => {
    if (!activeUnitId || !unitFormData[activeUnitId]) return;
    setIsSaving(true);
    const form = unitFormData[activeUnitId];
    try {
      const payload = {
        name: form.name,
        description: form.description,
        weekday_price: String(form.weekday_price),
        weekend_price: String(form.weekend_price),
        special_price: String(form.special_price),
        total_persons: parseInt(form.total_persons) || 0,
        available_persons: parseInt(form.total_persons) || 0,
        check_in_time: form.check_in_time,
        check_out_time: form.check_out_time,
        rating: parseFloat(form.rating) || 4.5,
        price_note: form.price_note,
        amenities: form.amenities.filter((a) => a.trim()),
        activities: form.activities.filter((a) => a.trim()),
        highlights: form.highlights.filter((h) => h.trim()),
        policies: form.policies.filter((p) => p.trim()),
        schedule: form.schedule.filter((s) => s.time.trim() || s.title.trim()),
        images: form.images.filter((i) => i.trim()),
        special_dates: Array.isArray(form.special_dates) ? form.special_dates : [],
      };
      const res = await villaAPI.updateUnit(activeUnitId, payload);
      if (res.success) {
        toast({ title: "Unit saved successfully" });
        onRefresh();
      } else {
        toast({ title: res.message || "Failed to save unit", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Error saving unit", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUnitImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeUnitId) return;
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const currentImages = unitFormData[activeUnitId]?.images || [];
    const remaining = 20 - currentImages.length;
    if (remaining <= 0) {
      toast({ title: "Maximum 20 images allowed per unit", variant: "destructive" });
      return;
    }
    const filesToUpload = files.slice(0, remaining);
    for (const file of filesToUpload) {
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      if (!["jpg", "jpeg", "png", "webp"].includes(ext)) {
        toast({ title: `"${file.name}" skipped — invalid format`, variant: "destructive" });
        continue;
      }
      setIsUploading(true);
      const token = localStorage.getItem("adminToken") || localStorage.getItem("ownerToken");
      const formDataUpload = new FormData();
      formDataUpload.append("image", file);
      try {
        const response = await fetch("/api/properties/upload-image", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formDataUpload,
        });
        const result = await response.json();
        if (result.success) {
          setUnitFormData((prev) => ({
            ...prev,
            [activeUnitId]: {
              ...prev[activeUnitId],
              images: [...prev[activeUnitId].images, result.url],
            },
          }));
          toast({ title: "Image uploaded" });
        } else {
          toast({ title: result.message || "Upload failed", variant: "destructive" });
        }
      } catch (error) {
        toast({ title: "Upload error", variant: "destructive" });
      }
    }
    setIsUploading(false);
    e.target.value = "";
  };

  const updateField = (field: keyof VillaUnitFormState, value: any) => {
    if (!activeUnitId) return;
    setUnitFormData((prev) => ({
      ...prev,
      [activeUnitId]: { ...prev[activeUnitId], [field]: value },
    }));
  };

  const updateArrayItem = (field: "amenities" | "activities" | "highlights" | "policies", index: number, value: string) => {
    if (!activeUnitId) return;
    const arr = [...(unitFormData[activeUnitId]?.[field] || [])];
    arr[index] = value;
    updateField(field, arr);
  };

  const addArrayItem = (field: "amenities" | "activities" | "highlights" | "policies") => {
    if (!activeUnitId) return;
    updateField(field, [...(unitFormData[activeUnitId]?.[field] || []), ""]);
  };

  const removeArrayItem = (field: "amenities" | "activities" | "highlights" | "policies", index: number) => {
    if (!activeUnitId) return;
    const arr = (unitFormData[activeUnitId]?.[field] || []).filter((_, i) => i !== index);
    updateField(field, arr.length ? arr : [""]);
  };

  const activeForm = activeUnitId ? unitFormData[activeUnitId] : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground font-display italic">Villa Units</h3>
        <Button
          type="button"
          size="sm"
          onClick={() => setIsAddingUnit(true)}
          className="bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 h-8"
        >
          <Plus className="w-4 h-4 mr-1" /> Add Unit
        </Button>
      </div>

      {units.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {units.map((unit) => (
            <div key={unit.id} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  if (!unitFormData[unit.id]) loadUnitIntoForm(unit);
                  setActiveUnitId(unit.id);
                }}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  activeUnitId === unit.id
                    ? "bg-gold text-black"
                    : "bg-white/5 text-white/60 border border-white/10 hover:bg-white/10"
                }`}
              >
                {unit.name}
              </button>
              <button
                type="button"
                onClick={() => handleDeleteUnit(unit.id)}
                className="p-1 text-red-500/40 hover:text-red-500 hover:bg-red-500/10 rounded transition-all"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {activeForm && activeUnitId && (
        <div className="glass rounded-2xl border border-border/50 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h4 className="text-gold font-display font-semibold">Editing: {activeForm.name}</h4>
            <div className="flex items-center gap-2">
              <Dialog open={calendarUnitId === activeUnitId} onOpenChange={(open) => { if (!open) setCalendarUnitId(null); }}>
                <DialogTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => { setCalendarUnitId(activeUnitId); setCalendarUnitName(activeForm.name); }}
                    className="h-8 text-[10px] border-gold/30 text-gold hover:bg-gold/10"
                  >
                    <Calendar className="w-3 h-3 mr-1" /> Calendar
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[450px] bg-charcoal border-white/10 rounded-3xl">
                  <DialogHeader>
                    <DialogTitle className="text-gold font-display">Manage Unit Calendar: {calendarUnitName}</DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">Select dates to manage availability and pricing for this unit.</DialogDescription>
                  </DialogHeader>
                  <CalendarSync propertyId={propertyId} unitId={activeUnitId} isAdmin={true} unitName={calendarUnitName} isVilla={true} />
                </DialogContent>
              </Dialog>
              <Button
                type="button"
                onClick={handleSaveUnit}
                disabled={isSaving}
                className="bg-gradient-gold text-black font-bold h-8 px-4 rounded-xl"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                Save Unit
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label>Unit Name</Label>
              <Input value={activeForm.name} onChange={(e) => updateField("name", e.target.value)} className="bg-white/5 border-white/10" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Description</Label>
              <Textarea value={activeForm.description} onChange={(e) => updateField("description", e.target.value)} className="bg-white/5 border-white/10 min-h-[80px]" />
            </div>
            <div className="space-y-2">
              <Label>Weekday Price</Label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input type="number" value={activeForm.weekday_price} onChange={(e) => updateField("weekday_price", e.target.value)} className="bg-white/5 border-white/10 pl-10" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Weekend Price</Label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input type="number" value={activeForm.weekend_price} onChange={(e) => updateField("weekend_price", e.target.value)} className="bg-white/5 border-white/10 pl-10" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Special Price</Label>
              <Input type="number" value={activeForm.special_price} onChange={(e) => updateField("special_price", e.target.value)} className="bg-white/5 border-white/10" />
            </div>
            <div className="space-y-2">
              <Label>Max Capacity (Total Persons)</Label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input type="number" value={activeForm.total_persons} onChange={(e) => updateField("total_persons", e.target.value)} className="bg-white/5 border-white/10 pl-10" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Check-in Time</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={activeForm.check_in_time} onChange={(e) => updateField("check_in_time", e.target.value)} className="bg-white/5 border-white/10 pl-10" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Check-out Time</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={activeForm.check_out_time} onChange={(e) => updateField("check_out_time", e.target.value)} className="bg-white/5 border-white/10 pl-10" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Rating (0-5)</Label>
              <div className="relative">
                <Star className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input type="number" step="0.1" min="0" max="5" value={activeForm.rating} onChange={(e) => updateField("rating", e.target.value)} className="bg-white/5 border-white/10 pl-10" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Price Note</Label>
              <Input value={activeForm.price_note} onChange={(e) => updateField("price_note", e.target.value)} className="bg-white/5 border-white/10" />
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-white/10">
            <div className="flex items-center justify-between">
              <Label className="text-gold">Special Date Prices</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => updateField("special_dates", [...activeForm.special_dates, { date: "", price: "" }])}
                className="bg-gold/10 border-gold/20 text-gold hover:bg-gold/20"
              >
                + Add Date
              </Button>
            </div>
            <div className="space-y-3">
              {activeForm.special_dates.map((sd, idx) => (
                <div key={idx} className="flex gap-3 items-end bg-white/5 p-3 rounded-xl">
                  <div className="flex-1 space-y-2">
                    <Label className="text-xs">Date</Label>
                    <Input
                      type="date"
                      value={sd.date}
                      onChange={(e) => {
                        const newDates = [...activeForm.special_dates];
                        newDates[idx] = { ...newDates[idx], date: e.target.value };
                        updateField("special_dates", newDates);
                      }}
                      className="bg-charcoal border-white/10"
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <Label className="text-xs">Price</Label>
                    <Input
                      type="number"
                      value={sd.price}
                      onChange={(e) => {
                        const newDates = [...activeForm.special_dates];
                        newDates[idx] = { ...newDates[idx], price: e.target.value };
                        updateField("special_dates", newDates);
                      }}
                      placeholder="₹ 2999"
                      className="bg-charcoal border-white/10"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => updateField("special_dates", activeForm.special_dates.filter((_, i) => i !== idx))}
                    className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {(["amenities", "activities", "highlights", "policies"] as const).map((field) => (
            <div key={field} className="space-y-2">
              <Label className="capitalize">{field}</Label>
              <div className="space-y-2">
                {(activeForm[field] as string[]).map((val, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input
                      value={val}
                      onChange={(e) => updateArrayItem(field, idx, e.target.value)}
                      className="bg-white/5 border-white/10 h-9"
                    />
                    <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-red-500/50 hover:text-red-500" onClick={() => removeArrayItem(field, idx)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" className="w-full border-dashed" onClick={() => addArrayItem(field)}>
                  <Plus className="w-3 h-3 mr-1" /> Add {field.charAt(0).toUpperCase() + field.slice(1)}
                </Button>
              </div>
            </div>
          ))}

          <div className="space-y-2">
            <Label>Schedule</Label>
            <div className="space-y-2">
              {activeForm.schedule.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <Input
                    value={item.time}
                    onChange={(e) => {
                      const newSchedule = [...activeForm.schedule];
                      newSchedule[idx] = { ...newSchedule[idx], time: e.target.value };
                      updateField("schedule", newSchedule);
                    }}
                    placeholder="Time"
                    className="bg-white/5 border-white/10 h-9 flex-1"
                  />
                  <Input
                    value={item.title}
                    onChange={(e) => {
                      const newSchedule = [...activeForm.schedule];
                      newSchedule[idx] = { ...newSchedule[idx], title: e.target.value };
                      updateField("schedule", newSchedule);
                    }}
                    placeholder="Activity"
                    className="bg-white/5 border-white/10 h-9 flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-red-500/50 hover:text-red-500"
                    onClick={() => {
                      const arr = activeForm.schedule.filter((_, i) => i !== idx);
                      updateField("schedule", arr.length ? arr : [{ time: "", title: "" }]);
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full border-dashed"
                onClick={() => updateField("schedule", [...activeForm.schedule, { time: "", title: "" }])}
              >
                <Plus className="w-3 h-3 mr-1" /> Add Schedule Item
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Unit Gallery ({activeForm.images.length}/20)</Label>
              <input
                type="file"
                id={`villa-unit-img-${activeUnitId}`}
                className="hidden"
                onChange={handleUnitImageUpload}
                accept=".jpg,.jpeg,.png,.webp"
                multiple
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => document.getElementById(`villa-unit-img-${activeUnitId}`)?.click()}
                disabled={isUploading || activeForm.images.length >= 20}
              >
                {isUploading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Upload className="w-3 h-3 mr-1" />} Upload
              </Button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {activeForm.images.map((img, idx) => (
                <div key={idx} className="aspect-square rounded-lg overflow-hidden relative group border border-white/10">
                  <img src={img} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                    onClick={() => updateField("images", activeForm.images.filter((_, i) => i !== idx))}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <Dialog open={isAddingUnit} onOpenChange={(open) => { if (!open) { setIsAddingUnit(false); setNewUnitName(""); } }}>
        <DialogContent className="bg-charcoal border-white/10 rounded-3xl sm:max-w-[400px]" aria-describedby="villa-add-unit-desc">
          <DialogHeader>
            <DialogTitle className="text-gold font-display">Add New Villa Unit</DialogTitle>
            <p id="villa-add-unit-desc" className="text-xs text-muted-foreground">Enter a name for the new unit.</p>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="villa-unit-name">Unit Name</Label>
              <Input
                id="villa-unit-name"
                value={newUnitName}
                onChange={(e) => setNewUnitName(e.target.value)}
                placeholder="e.g. Villa Suite A"
                className="bg-white/5 border-white/10"
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <Button type="button" onClick={handleCreateUnit} disabled={isCreating || !newUnitName.trim()} className="flex-1 bg-gradient-gold text-black font-bold h-10 rounded-xl">
                {isCreating ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />} Save
              </Button>
              <Button type="button" variant="outline" onClick={() => { setIsAddingUnit(false); setNewUnitName(""); }} className="flex-1 h-10 rounded-xl">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const AdminPropertyForm = ({
  property,
  onSuccess,
  onCancel,
}: AdminPropertyFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [propertyUnits, setPropertyUnits] = useState<any[]>([]);
  const [isOtpEditing, setIsOtpEditing] = useState(false);
  const [otpEditValue, setOtpEditValue] = useState("");
  const [isSavingOtp, setIsSavingOtp] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "campings_cottages",
    location: "",
    map_link: "",
    rating: "4.5",
    price: "",
    weekday_price: "",
    weekend_price: "",
    price_note: "per person with meal",
    capacity: "4",
    check_in_time: "2:00 PM",
    check_out_time: "11:00 AM",
    owner_otp_number: "",
    status: "Verified",
    referral_code: "",
    is_active: true,
    is_available: true,
    max_capacity: "4",
    contact: "+91 8806092609",
    owner_name: "",
    owner_whatsapp_number: "",
    property_id: "",
    availability: [] as string[],
    amenities: [""],
    activities: [""],
    highlights: [""],
    policies: [""],
    schedule: [{ time: "", title: "" }],
    images: [] as string[],
    special_dates: [] as { date: string; price: string }[],
  });
  const { toast } = useToast();

  const fetchUnits = async () => {
    if (!property?.id) return;
    const res = await propertyAPI.getUnits(property.id);
    if (res.success) setPropertyUnits(res.data);
  };

  useEffect(() => {
    if (property) {
      fetchUnits();
    }
  }, [property]);

  useEffect(() => {
    const fetchOwnerReferral = async () => {
      try {
        const propId = property?.property_id || property?.id;
        if (propId) {
          const response = await fetch(`/api/referrals/owner-lookup-property/${propId}`);
          const result = await response.json();
          if (result.found && result.data?.referral_code) {
            setFormData((prev) => ({
              ...prev,
              referral_code: result.data.referral_code,
            }));
            return;
          }
        }
        const mobile = formData.owner_whatsapp_number?.replace(/\D/g, "");
        if (!mobile || mobile.length < 10) return;
        const response = await fetch(`/api/referrals/owner-lookup/${mobile}`);
        const result = await response.json();
        if (result.found && result.data?.referral_code) {
          setFormData((prev) => ({
            ...prev,
            referral_code: result.data.referral_code,
          }));
        }
      } catch (e) {}
    };
    if (property) {
      fetchOwnerReferral();
    }
  }, [property]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const currentCount = formData.images.filter((img) => img.trim()).length;
    const remaining = 20 - currentCount;
    if (remaining <= 0) {
      toast({
        title: "Maximum 20 images allowed per property",
        variant: "destructive",
      });
      return;
    }
    const filesToUpload = files.slice(0, remaining);
    if (files.length > remaining) {
      toast({
        title: `Only uploading ${remaining} image(s) to stay within the 20 limit`,
        variant: "destructive",
      });
    }

    setIsUploading(true);
    const token = localStorage.getItem("adminToken");

    for (const file of filesToUpload) {
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      if (!["jpg", "jpeg", "png", "webp"].includes(ext)) {
        toast({
          title: `"${file.name}" skipped — invalid format. Allowed: jpg, jpeg, png, webp`,
          variant: "destructive",
        });
        continue;
      }

      const formDataUpload = new FormData();
      formDataUpload.append("image", file);

      try {
        const response = await fetch("/api/properties/upload-image", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formDataUpload,
        });

        const result = await response.json();
        if (result.success) {
          setFormData((prev) => ({
            ...prev,
            images: [...prev.images.filter((img) => img.trim()), result.url],
          }));
          toast({ title: "Image uploaded successfully" });
        } else {
          toast({
            title: "Upload failed",
            description: result.message,
            variant: "destructive",
          });
        }
      } catch (error) {
        toast({ title: "Upload error", variant: "destructive" });
      }
    }
    setIsUploading(false);
    e.target.value = "";
  };

  useEffect(() => {
    if (property) {
      setFormData({
        title: property.title || "",
        description: property.description || "",
        category: property.category || "camping",
        location: property.location || "",
        map_link: property.map_link || "",
        rating: property.rating?.toString() || "4.5",
        price: property.price || "",
        weekday_price: property.weekday_price || "",
        weekend_price: property.weekend_price || "",
        price_note: property.price_note || "per person with meal",
        capacity: property.capacity?.toString() || "4",
        check_in_time: property.check_in_time || "2:00 PM",
        check_out_time: property.check_out_time || "11:00 AM",
        owner_otp_number: property.owner_otp_number || "",
        status: property.status || "Verified",
        referral_code: property.referral_code || "",
        is_active: property.is_active ?? true,
        is_available: property.is_available ?? true,
        max_capacity:
          property.max_capacity?.toString() ||
          property.capacity?.toString() ||
          "4",
        contact: property.contact || "+91 8806092609",
        owner_name: property.owner_name || "",
        owner_whatsapp_number: property.owner_whatsapp_number || "",
        property_id: property.property_id || "",
        availability: property.availability || [],
        amenities: property.amenities?.length ? property.amenities : [""],
        activities: property.activities?.length ? property.activities : [""],
        highlights: property.highlights?.length ? property.highlights : [""],
        policies: property.policies?.length ? property.policies : [""],
        schedule: property.schedule?.length
          ? property.schedule
          : [{ time: "", title: "" }],
        images: property.images?.length
          ? property.images.map((img: any) =>
              typeof img === "string" ? img : img.image_url,
            )
          : [],
        special_dates: property.special_dates
          ? typeof property.special_dates === "string"
            ? JSON.parse(property.special_dates)
            : property.special_dates
          : [],
      });
    } else {
      // Generate a new 5-digit property ID for new property
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      let newId = "";
      for (let i = 0; i < 5; i++) {
        newId += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      setFormData((prev) => ({ ...prev, property_id: newId }));
    }
  }, [property]);

  const handleSaveOtp = async () => {
    const cleaned = otpEditValue.replace(/\D/g, "");
    if (cleaned.length < 10) {
      toast({
        title: "Invalid OTP number",
        description: "Must be at least 10 digits",
        variant: "destructive",
      });
      return;
    }
    setIsSavingOtp(true);
    try {
      const token = localStorage.getItem("adminToken");
      const response = await fetch("/api/referrals/admin/update-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          property_id: formData.property_id || String(property?.id || ""),
          new_otp_number: cleaned,
        }),
      });
      const result = await response.json();
      if (result.success) {
        setFormData((prev) => ({ ...prev, owner_otp_number: cleaned }));
        setIsOtpEditing(false);
        toast({ title: "OTP number updated successfully" });
      } else {
        toast({
          title: "Update failed",
          description: result.error || "Something went wrong",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({ title: "Error updating OTP number", variant: "destructive" });
    } finally {
      setIsSavingOtp(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const token = localStorage.getItem("adminToken");
    const url = property
      ? `/api/properties/update/${property.id}`
      : "/api/properties/create";
    const method = property ? "PUT" : "POST";

    const payload = {
      ...formData,
      owner_otp_number: property ? formData.owner_otp_number : "",
      rating: parseFloat(formData.rating) || 4.5,
      capacity: parseInt(formData.capacity) || 4,
      max_capacity:
        parseInt(formData.max_capacity) || parseInt(formData.capacity) || 4,
      amenities: formData.amenities.filter((a) => a.trim()),
      activities: formData.activities.filter((a) => a.trim()),
      highlights: formData.highlights.filter((h) => h.trim()),
      policies: formData.policies.filter((p) => p.trim()),
      schedule: formData.schedule.filter(
        (s) => s.time.trim() || s.title.trim(),
      ),
      images: formData.images.filter((i) => i.trim()),
      special_dates: Array.isArray(formData.special_dates)
        ? formData.special_dates
        : [],
    };

    // For campings_cottages, we don't send individual prices as they come from units
    if (formData.category === "campings_cottages") {
      (payload as any).price = payload.price || "Price on Selection";
      delete (payload as any).weekday_price;
      delete (payload as any).weekend_price;
    } else if (formData.category === "villa") {
      // Include weekday and weekend prices for villas
      (payload as any).weekday_price = formData.weekday_price;
      (payload as any).weekend_price = formData.weekend_price;
    }

    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: property ? "Property updated!" : "Property created!",
          description: "Your changes have been saved successfully.",
        });
        onSuccess();
      } else {
        toast({
          title: "Error",
          description: result.message || "Something went wrong",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save property",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleArrayChange = (
    field:
      | "amenities"
      | "activities"
      | "highlights"
      | "policies"
      | "images"
      | "schedule",
    index: number,
    value: any,
  ) => {
    const newArray = [...formData[field]];
    newArray[index] = value;
    setFormData({ ...formData, [field]: newArray });
  };

  const addArrayItem = (
    field:
      | "amenities"
      | "activities"
      | "highlights"
      | "policies"
      | "images"
      | "schedule",
  ) => {
    const newItem = field === "schedule" ? { time: "", title: "" } : "";
    setFormData({ ...formData, [field]: [...formData[field], newItem] });
  };

  const removeArrayItem = (
    field:
      | "amenities"
      | "activities"
      | "highlights"
      | "policies"
      | "images"
      | "schedule",
    index: number,
  ) => {
    const newArray = formData[field].filter((_, i) => i !== index);
    const defaultValue = field === "schedule" ? { time: "", title: "" } : "";
    setFormData({
      ...formData,
      [field]: newArray.length ? newArray : [defaultValue],
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="glass-dark border-b border-border/50 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={onCancel}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Back to Dashboard</span>
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-gold-dark flex items-center justify-center">
                <Building2 className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-foreground">
                {property ? "Edit Property" : "New Property"}
              </span>
            </div>
            <div className="w-24" />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <div className="mb-8 animate-fade-up">
          <h1 className="font-display text-3xl font-semibold text-foreground mb-2 flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-primary" />
            {property ? "Edit Property" : "Add New Property"}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="glass rounded-2xl border border-border/50 p-6 animate-fade-up">
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 mb-8 bg-secondary/20 p-4 rounded-xl border border-border/30">
              <div className="flex items-center gap-4 flex-1 min-w-[200px]">
                <Label
                  htmlFor="status"
                  className="text-sm font-medium shrink-0"
                >
                  Status
                </Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) =>
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger className="flex-1 h-10 bg-background">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Verified">Verified</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Unverified">Unverified</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, is_active: checked })
                    }
                  />
                  <Label htmlFor="is_active" className="text-xs sm:text-sm">
                    Active
                  </Label>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    id="is_available"
                    checked={formData.is_available}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, is_available: checked })
                    }
                  />
                  <Label htmlFor="is_available" className="text-xs sm:text-sm">
                    Available
                  </Label>
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="referral_code" className="text-xs sm:text-sm">
                    Referral Code
                  </Label>
                  <Input
                    id="referral_code"
                    value={formData.referral_code}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        referral_code: e.target.value,
                      })
                    }
                    placeholder="Enter referral code"
                    className="h-10 bg-secondary/50 rounded-xl"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="property_id" className="text-muted-foreground">
                  Property ID (Auto-generated)
                </Label>

                <div className="flex items-center gap-2">
                  <Input
                    id="property_id"
                    value={formData.property_id || "Generating..."}
                    disabled
                    className="h-12 bg-secondary/30 rounded-xl border-dashed opacity-70 cursor-not-allowed flex-1"
                  />

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={!formData.property_id}
                    onClick={() =>
                      navigator.clipboard.writeText(formData.property_id)
                    }
                    title="Copy Property ID"
                    className="hover:text-primary"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    setFormData({ ...formData, category: value })
                  }
                >
                  <SelectTrigger className="h-12 bg-secondary/50 rounded-xl">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="campings_cottages">
                      Campings & Cottages
                    </SelectItem>
                    <SelectItem value="villa">Villa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.category === "villa" && property?.id && (
                <div className="space-y-2 md:col-span-2">
                  <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                    <VillaUnitManager
                      propertyId={property.id}
                      units={propertyUnits}
                      onRefresh={fetchUnits}
                    />
                  </div>
                </div>
              )}

              {formData.category === "villa" && !property && (
                <div className="space-y-2 md:col-span-2">
                  <p className="text-sm text-muted-foreground italic">
                    Save the property first to enable villa unit management.
                  </p>
                </div>
              )}

              {formData.category === "campings_cottages" && (
                <div className="space-y-2 md:col-span-2">
                  <Label>
                    Availability Calendar (Syncs with Owner Dashboard)
                  </Label>
                  {property && (
                    <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                      <UnitManager
                        propertyId={property.id}
                        category={formData.category}
                        units={propertyUnits}
                        onRefresh={fetchUnits}
                      />
                    </div>
                  )}
                  {!property && (
                    <p className="text-sm text-muted-foreground italic">
                      Save the property first to enable calendar/unit management.
                    </p>
                  )}
                </div>
              )}

              {formData.category === "villa" && property && propertyUnits.length === 0 && (
                <div className="space-y-2 md:col-span-2">
                  <Label>
                    Availability Calendar (Syncs with Owner Dashboard)
                  </Label>
                  <CalendarSync
                    propertyId={property.property_id || property.id}
                    isAdmin={true}
                    isVilla={true}
                  />
                </div>
              )}

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="title">Property Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="h-12 bg-secondary/50 rounded-xl"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location *</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) =>
                      setFormData({ ...formData, location: e.target.value })
                    }
                    className="h-12 pl-10 bg-secondary/50 rounded-xl"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="map_link">Google Maps Link *</Label>
                <Input
                  id="map_link"
                  value={formData.map_link}
                  onChange={(e) =>
                    setFormData({ ...formData, map_link: e.target.value })
                  }
                  className="h-12 bg-secondary/50 rounded-xl"
                  placeholder="Paste Google Maps URL here"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">
                  {formData.category === "villa"
                    ? "Base Price (Displayed) *"
                    : "Starting Price (Auto-calculated)"}
                </Label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="price"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({ ...formData, price: e.target.value })
                    }
                    className="h-12 pl-10 bg-secondary/50 rounded-xl"
                    placeholder={
                      formData.category === "campings_cottages"
                        ? "Price from units will be used"
                        : "e.g. ₹15,000"
                    }
                    disabled={formData.category === "campings_cottages"}
                    required={formData.category === "villa"}
                  />
                </div>
                {formData.category === "campings_cottages" && (
                  <p className="text-[10px] text-primary mt-1 italic">
                    * Minimum price from available units will be displayed
                    automatically.
                  </p>
                )}
              </div>

              {formData.category === "villa" && (
                <div className="md:col-span-2 space-y-4 pt-4 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <Label className="text-gold flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Special Day Prices
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          special_dates: [
                            ...formData.special_dates,
                            { date: "", price: "" },
                          ],
                        })
                      }
                      className="bg-gold/10 border-gold/20 text-gold hover:bg-gold/20"
                    >
                      <Plus className="w-3 h-3 mr-1" /> Add Special Day
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {formData.special_dates.map((sd, idx) => (
                      <div
                        key={idx}
                        className="flex gap-2 items-center bg-white/5 p-3 rounded-xl border border-white/10"
                      >
                        <Input
                          type="date"
                          value={sd.date}
                          onChange={(e) => {
                            const newDates = [...formData.special_dates];
                            newDates[idx].date = e.target.value;
                            setFormData({
                              ...formData,
                              special_dates: newDates,
                            });
                          }}
                          className="flex-1 bg-charcoal border-white/10 text-xs"
                        />
                        <div className="relative flex-1">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gold text-xs">
                            ₹
                          </span>
                          <Input
                            type="number"
                            value={sd.price}
                            onChange={(e) => {
                              const newDates = [...formData.special_dates];
                              newDates[idx].price = e.target.value;
                              setFormData({
                                ...formData,
                                special_dates: newDates,
                              });
                            }}
                            placeholder="Price"
                            className="pl-5 bg-charcoal border-white/10 text-xs"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const newDates = formData.special_dates.filter(
                              (_, i) => i !== idx,
                            );
                            setFormData({
                              ...formData,
                              special_dates: newDates,
                            });
                          }}
                          className="text-red-500 hover:text-red-400 h-8 w-8"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="price_note">Price Note *</Label>
                <Input
                  id="price_note"
                  value={formData.price_note}
                  onChange={(e) =>
                    setFormData({ ...formData, price_note: e.target.value })
                  }
                  className="h-12 bg-secondary/50 rounded-xl"
                  required
                />
              </div>

              {formData.category === "villa" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="weekday_price">
                      Weekday Price (Base Price)
                    </Label>
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="weekday_price"
                        value={formData.weekday_price}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            weekday_price: e.target.value,
                          })
                        }
                        className="h-12 pl-10 bg-secondary/50 rounded-xl"
                        placeholder="e.g., ₹7,499"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="weekend_price">Weekend Price</Label>
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="weekend_price"
                        value={formData.weekend_price}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            weekend_price: e.target.value,
                          })
                        }
                        className="h-12 pl-10 bg-secondary/50 rounded-xl"
                        placeholder="e.g., ₹9,999"
                      />
                    </div>
                  </div>
                </>
              )}

              {formData.category === "villa" ? (
                <div className="space-y-2">
                  <Label htmlFor="max_capacity">Max Capacity *</Label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="max_capacity"
                      type="number"
                      value={formData.max_capacity}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          max_capacity: e.target.value,
                          capacity: e.target.value,
                        })
                      }
                      className="h-12 pl-10 bg-secondary/50 rounded-xl"
                      required
                    />
                  </div>
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="rating">Rating (0-5) *</Label>
                <div className="relative">
                  <Star className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="rating"
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    value={formData.rating}
                    onChange={(e) =>
                      setFormData({ ...formData, rating: e.target.value })
                    }
                    className="h-12 pl-10 bg-secondary/50 rounded-xl"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="check_in_time">Check-in Time</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="check_in_time"
                    value={formData.check_in_time}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        check_in_time: e.target.value,
                      })
                    }
                    className="h-12 pl-10 bg-secondary/50 rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="check_out_time">Check-out Time</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="check_out_time"
                    value={formData.check_out_time}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        check_out_time: e.target.value,
                      })
                    }
                    className="h-12 pl-10 bg-secondary/50 rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="owner_name">Owner Name *</Label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="owner_name"
                    value={formData.owner_name}
                    onChange={(e) =>
                      setFormData({ ...formData, owner_name: e.target.value })
                    }
                    className="h-12 pl-10 bg-secondary/50 rounded-xl"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="owner_whatsapp_number">Owner WhatsApp Number *</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="owner_whatsapp_number"
                    value={formData.owner_whatsapp_number}
                    onChange={(e) =>
                      setFormData({ ...formData, owner_whatsapp_number: e.target.value })
                    }
                    className="h-12 pl-10 bg-secondary/50 rounded-xl"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="owner_otp_number">Owner OTP Number</Label>
                {property ? (
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    {isOtpEditing ? (
                      <div className="flex gap-2">
                        <Input
                          id="owner_otp_number"
                          value={otpEditValue}
                          onChange={(e) => setOtpEditValue(e.target.value)}
                          className="h-12 pl-10 bg-secondary/50 rounded-xl flex-1"
                          placeholder="Enter new OTP number"
                          autoFocus
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={handleSaveOtp}
                          disabled={isSavingOtp}
                          className="h-12 w-12 text-green-500 hover:text-green-400 hover:bg-green-500/10 shrink-0"
                        >
                          {isSavingOtp ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => setIsOtpEditing(false)}
                          disabled={isSavingOtp}
                          className="h-12 w-12 text-red-500 hover:text-red-400 hover:bg-red-500/10 shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Input
                          id="owner_otp_number"
                          value={formData.owner_otp_number || "Not registered yet"}
                          disabled
                          className="h-12 pl-10 bg-secondary/50 rounded-xl flex-1 disabled:opacity-70"
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setOtpEditValue(formData.owner_otp_number || "");
                            setIsOtpEditing(true);
                          }}
                          className="h-12 w-12 text-muted-foreground hover:text-white hover:bg-white/10 shrink-0"
                          title="Edit OTP Number"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="owner_otp_number"
                      value=""
                      disabled
                      placeholder="Auto-set on owner registration"
                      className="h-12 pl-10 bg-secondary/50 rounded-xl disabled:opacity-60"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      This will be set automatically when the owner registers via "Register Your Property"
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact">Admin Mobile Number *</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="contact"
                    value={formData.contact}
                    onChange={(e) =>
                      setFormData({ ...formData, contact: e.target.value })
                    }
                    className="h-12 pl-10 bg-secondary/50 rounded-xl"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Arrays: Amenities, Activities, Highlights, Policies */}
          {[
            {
              label: "Amenities",
              field: "amenities" as const,
              icon: Star,
              hide: formData.category === "campings_cottages",
            },
            {
              label: "Activities",
              field: "activities" as const,
              icon: Sparkles,
            },
            {
              label: "Highlights (What You'll Love)",
              field: "highlights" as const,
              icon: Star,
            },
            {
              label: "Rules & Policies",
              field: "policies" as const,
              icon: Clock,
            },
          ]
            .filter((s) => !s.hide)
            .map((section) => (
              <div
                key={section.field}
                className="glass rounded-2xl border border-border/50 p-6"
              >
                <h2 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
                  <section.icon className="w-5 h-5 text-primary" />
                  {section.label} *
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {formData[section.field].map((item, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <Input
                        value={item}
                        onChange={(e) =>
                          handleArrayChange(
                            section.field,
                            index,
                            e.target.value,
                          )
                        }
                        placeholder={section.label.slice(0, -1)}
                        className="h-12 bg-secondary/50 rounded-xl"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeArrayItem(section.field, index)}
                        className="h-10 w-10 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl flex-shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => addArrayItem(section.field)}
                  className="mt-3 h-10 rounded-xl border-dashed hover:border-primary hover:bg-primary/5 transition-all"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add {section.label.slice(0, -1)}
                </Button>
              </div>
            ))}

          {/* Schedule */}
          <div className="glass rounded-2xl border border-border/50 p-6">
            <h2 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Property Schedule
            </h2>
            <div className="space-y-4">
              {formData.schedule.map((item: any, index: number) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
                    <Input
                      value={item.time}
                      onChange={(e) =>
                        handleArrayChange("schedule", index, {
                          ...item,
                          time: e.target.value,
                        })
                      }
                      placeholder="Time (e.g. 4:30 PM)"
                      className="h-12 bg-secondary/50 rounded-xl"
                    />
                    <Input
                      value={item.title}
                      onChange={(e) =>
                        handleArrayChange("schedule", index, {
                          ...item,
                          title: e.target.value,
                        })
                      }
                      placeholder="Activity (e.g. Tea & Snacks)"
                      className="h-12 bg-secondary/50 rounded-xl"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeArrayItem("schedule", index)}
                    className="h-10 w-10 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => addArrayItem("schedule")}
              className="mt-4 h-10 rounded-xl border-dashed hover:border-primary hover:bg-primary/5 transition-all"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Schedule Item
            </Button>
          </div>

          {/* Images - hidden for both campings_cottages and villa (villa images handled in units) */}
          {formData.category !== "campings_cottages" && formData.category !== "villa" && (
            <div className="glass rounded-2xl border border-border/50 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Star className="w-5 h-5 text-primary" />
                  Property Images * (
                  {formData.images.filter((img) => img.trim()).length}/20)
                </h2>
                <div className="relative">
                  <input
                    type="file"
                    id="image-upload"
                    className="hidden"
                    accept=".jpg,.jpeg,.png,.webp"
                    onChange={handleImageUpload}
                    disabled={isUploading}
                    multiple
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-xl gap-2"
                    disabled={
                      isUploading ||
                      formData.images.filter((img) => img.trim()).length >= 20
                    }
                    onClick={() =>
                      document.getElementById("image-upload")?.click()
                    }
                  >
                    {isUploading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    Upload Image
                  </Button>
                </div>
              </div>
              <div className="space-y-3">
                {formData.images
                  .filter((img) => img.trim())
                  .map((image, index) => (
                    <div key={index} className="flex items-center gap-3 group">
                      <div className="flex-1 relative">
                        <Input
                          value={image}
                          readOnly
                          className="h-12 bg-secondary/30 rounded-xl pr-12 text-muted-foreground"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg overflow-hidden bg-secondary">
                          <img
                            src={image}
                            alt=""
                            className="w-full h-full object-cover"
                            onError={(e) =>
                              (e.currentTarget.style.display = "none")
                            }
                          />
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const newImages = formData.images.filter(
                            (_, i) => i !== index,
                          );
                          setFormData((prev) => ({
                            ...prev,
                            images: newImages,
                          }));
                        }}
                        className="h-10 w-10 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                {formData.images.filter((img) => img.trim()).length === 0 && (
                  <div className="text-center py-8 border-2 border-dashed border-border/50 rounded-2xl bg-secondary/10">
                    <ImageIcon className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-20" />
                    <p className="text-sm text-muted-foreground">
                      No images uploaded yet
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="glass rounded-2xl border border-border/50 p-6">
            <Label
              htmlFor="description"
              className="text-lg font-semibold mb-6 block"
            >
              Description *
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="min-h-[150px] bg-secondary/50 rounded-xl resize-none"
              placeholder="Provide a detailed description of the property..."
              required
            />
          </div>

          <div className="flex items-center justify-end gap-4 pt-4 animate-fade-up">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="h-12 px-8 rounded-xl"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="h-12 px-8 rounded-xl bg-gradient-to-r from-primary to-gold-dark"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5 mr-2" />
                  {property ? "Update Property" : "Create Property"}
                </>
              )}
            </Button>
          </div>
        </form>

        {formData.category === "campings_cottages" && property?.id && (
          <div className="mt-8 glass rounded-2xl border border-border/50 p-6 animate-fade-up">
            <UnitManager
              propertyId={property.id}
              category={formData.category}
              units={propertyUnits}
              onRefresh={async () => {
                await fetchUnits();
              }}
            />
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminPropertyForm;
