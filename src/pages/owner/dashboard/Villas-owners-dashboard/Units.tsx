import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  LayoutGrid,
  Plus,
  Trash2,
  Upload,
  ImageIcon,
  Loader2,
  Sparkles,
  X,
  Users,
  MapPin,
  Clock,
  Star,
  IndianRupee,
} from "lucide-react";
import { toast } from "sonner";
import { villaAPI } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const defaultUnitForm = {
  name: "",
  title: "",
  description: "",
  weekday_price: "0",
  weekend_price: "0",
  special_price: "0",
  max_capacity: "0",
  check_in_time: "2:00 PM",
  check_out_time: "11:00 AM",
  rating: "4.5",
  price_note: "",
  location: "",
  google_maps_link: "",
  amenities: [""] as string[],
  activities: [""] as string[],
  highlights: [""] as string[],
  policies: [""] as string[],
  schedule: [{ time: "", title: "" }] as { time: string; title: string }[],
  images: [] as string[],
  special_dates: [] as { date: string; price: string }[],
};

const VillaOwnerUnits = () => {
  const [loading, setLoading] = useState(true);
  const [property, setProperty] = useState<any>(null);
  const [units, setUnits] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingUnit, setEditingUnit] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [unitForm, setUnitForm] = useState({ ...defaultUnitForm });

  const fetchData = async () => {
    const ownerDataString = localStorage.getItem("ownerData");
    if (!ownerDataString) return;
    const ownerData = JSON.parse(ownerDataString);
    const id = ownerData.property_id || ownerData.propertyId;

    try {
      const result = await villaAPI.getById(id);

      if (result.success && result.data) {
        setProperty(result.data);
        const unitsRes = await villaAPI.getUnits(id);
        if (unitsRes.success) {
          setUnits(unitsRes.data);
        }
      }
    } catch (error) {
      console.error("Error fetching units:", error);
      toast.error("Failed to load units");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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

  const handleEdit = (unit: any) => {
    const parsedAmenities = parseJson(unit.amenities);
    const parsedActivities = parseJson(unit.activities);
    const parsedHighlights = parseJson(unit.highlights);
    const parsedPolicies = parseJson(unit.policies);
    const parsedSchedule = parseJson(unit.schedule);
    const parsedImages = parseJson(unit.images);
    const parsedSpecialDates = parseJson(unit.special_dates);

    setEditingUnit(unit);
    setUnitForm({
      name: unit.name || "",
      title: unit.title || "",
      description: unit.description || "",
      max_capacity: (unit.total_persons || unit.max_capacity || 0).toString(),
      weekday_price: (unit.weekday_price || 0).toString(),
      weekend_price: (unit.weekend_price || 0).toString(),
      special_price: (unit.special_price || 0).toString(),
      check_in_time: unit.check_in_time || "2:00 PM",
      check_out_time: unit.check_out_time || "11:00 AM",
      rating: (unit.rating || 4.5).toString(),
      price_note: unit.price_note || "",
      location: unit.location || "",
      google_maps_link: unit.google_maps_link || "",
      amenities: parsedAmenities.length ? parsedAmenities : [""],
      activities: parsedActivities.length ? parsedActivities : [""],
      highlights: parsedHighlights.length ? parsedHighlights : [""],
      policies: parsedPolicies.length ? parsedPolicies : [""],
      schedule: parsedSchedule.length ? parsedSchedule : [{ time: "", title: "" }],
      images: parsedImages,
      special_dates: parsedSpecialDates,
    });
    setIsAdding(true);
  };

  const handleSaveUnit = async () => {
    try {
      const payload = {
        name: unitForm.name,
        title: unitForm.title,
        description: unitForm.description,
        total_persons: parseInt(unitForm.max_capacity),
        available_persons: parseInt(unitForm.max_capacity),
        weekday_price: parseFloat(unitForm.weekday_price),
        weekend_price: parseFloat(unitForm.weekend_price),
        special_price: parseFloat(unitForm.special_price),
        check_in_time: unitForm.check_in_time,
        check_out_time: unitForm.check_out_time,
        rating: parseFloat(unitForm.rating) || 4.5,
        price_note: unitForm.price_note,
        location: unitForm.location,
        google_maps_link: unitForm.google_maps_link,
        amenities: unitForm.amenities.filter((a) => a.trim()),
        activities: unitForm.activities.filter((a) => a.trim()),
        highlights: unitForm.highlights.filter((h) => h.trim()),
        policies: unitForm.policies.filter((p) => p.trim()),
        schedule: unitForm.schedule.filter((s) => s.time.trim() || s.title.trim()),
        images: unitForm.images.filter((i) => i.trim()),
        special_dates: unitForm.special_dates,
      };

      const id = property.property_id || property.propertyId || property.id;
      let res;
      if (editingUnit) {
        res = await villaAPI.updateUnit(editingUnit.id, payload);
      } else {
        res = await villaAPI.createUnit(id, payload);
      }

      if (res.success) {
        toast.success(
          editingUnit
            ? "Unit updated successfully"
            : "Unit created successfully",
        );
        setIsAdding(false);
        setEditingUnit(null);
        fetchData();
      } else {
        toast.error(res.message || "Failed to save unit");
      }
    } catch (e) {
      toast.error("Error saving unit");
    }
  };

  const handleUnitImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const remaining = 20 - unitForm.images.length;
    if (remaining <= 0) {
      toast.error("Maximum 20 images allowed per unit");
      return;
    }
    const filesToUpload = files.slice(0, remaining);
    if (files.length > remaining) {
      toast.error(
        `Only uploading ${remaining} image(s) to stay within the 20 limit`,
      );
    }

    setIsUploading(true);
    const token =
      localStorage.getItem("ownerToken") || localStorage.getItem("adminToken");

    for (const file of filesToUpload) {
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      if (!["jpg", "jpeg", "png", "webp"].includes(ext)) {
        toast.error(
          `"${file.name}" skipped — invalid format. Allowed: jpg, jpeg, png, webp`,
        );
        continue;
      }

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
          toast.success("Image uploaded");
        } else {
          toast.error(result.message || "Upload failed");
        }
      } catch (error) {
        toast.error("Upload error");
      }
    }
    setIsUploading(false);
    e.target.value = "";
  };

  if (loading)
    return (
      <div className="p-8 text-center text-[#D4AF37]">Loading units...</div>
    );

  return (
    <div className="space-y-6 max-w-full sm:max-w-4xl mx-auto px-4 sm:px-4 pb-10">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold text-[#D4AF37] font-display tracking-tight">
          Manage Villa Units
        </h1>
        <Button
          onClick={() => {
            setEditingUnit(null);
            setUnitForm({
              name: "",
              title: "",
              description: "",
              weekday_price: "0",
              weekend_price: "0",
              special_price: "0",
              max_capacity: "0",
              check_in_time: "2:00 PM",
              check_out_time: "11:00 AM",
              rating: "4.5",
              price_note: "",
              location: "",
              google_maps_link: "",
              amenities: [""] as string[],
              activities: [""] as string[],
              highlights: [""] as string[],
              policies: [""] as string[],
              schedule: [{ time: "", title: "" }] as { time: string; title: string }[],
              images: [] as string[],
              special_dates: [] as { date: string; price: string }[],
            });
            setIsAdding(true);
          }}
          className="bg-gold hover:bg-gold/90 text-black font-bold"
        >
          <Plus className="w-4 h-4 mr-2" /> Add Unit
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {units.map((unit) => {
          const hasBooking = unit.has_booking || false;
          return (
            <Card
              key={unit.id}
              className="glass border-[#D4AF37]/20 bg-black/40 rounded-2xl overflow-hidden shadow-xl"
            >
              <CardContent className="p-5">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-5">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-white/5 border border-white/10 flex-shrink-0">
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
                        <ImageIcon className="w-full h-full p-4 text-white/20" />
                      )}
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight leading-tight">
                        {unit.name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[9px] font-bold text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded border border-blue-400/20 uppercase flex items-center gap-1">
                          <Users className="w-3 h-3" /> Max Capacity: {unit.total_persons || unit.max_capacity || 0}
                        </span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${hasBooking ? 'text-red-400 bg-red-400/10 border border-red-400/20' : 'text-green-400 bg-green-400/10 border border-green-400/20'}`}>
                          {hasBooking ? 'Booked' : 'Available'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="w-full sm:w-auto flex flex-row sm:flex-col justify-between sm:justify-center items-center sm:items-end bg-white/5 sm:bg-transparent p-3 sm:p-0 rounded-xl">
                    <div className="text-xl font-black text-[#D4AF37] leading-none">
                      ₹{unit.weekday_price || "0"}
                    </div>
                    <div className="text-[9px] text-gray-500 uppercase tracking-[0.1em] sm:mt-1 font-bold">
                      Weekday
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => handleEdit(unit)}
                  className="w-full bg-[#D4AF37]/5 hover:bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20 h-11 rounded-xl font-bold transition-all"
                >
                  <Sparkles className="w-4 h-4 mr-2" /> Edit Unit
                </Button>
              </CardContent>
            </Card>
          );
        })}

        {units.length === 0 && (
          <div className="text-center py-16 glass border border-white/5 rounded-2xl bg-black/20">
            <LayoutGrid className="w-12 h-12 text-gray-700 mx-auto mb-4 opacity-50" />
            <p className="text-gray-500 font-medium italic">No units found. Add your first villa unit.</p>
          </div>
        )}
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
          className="bg-charcoal border-white/10 rounded-3xl max-h-[90vh] overflow-y-auto sm:max-w-[700px] w-[95vw] p-0"
          aria-describedby="villa-unit-form-desc"
        >
          <div className="p-6 sm:p-8">
            <DialogHeader className="mb-6 text-center">
              <DialogTitle className="text-gold font-display text-xl sm:text-2xl">
                {editingUnit ? "Edit Villa Unit" : "Add New Villa Unit"}
              </DialogTitle>
              <DialogDescription
                id="villa-unit-form-desc"
                className="text-xs text-muted-foreground"
              >
                Specify the details for this villa unit including name,
                capacity, and amenities.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-gray-400 text-xs font-bold">
                    Unit Name
                  </Label>
                  <Input
                    value={unitForm.name}
                    onChange={(e) =>
                      setUnitForm({ ...unitForm, name: e.target.value })
                    }
                    placeholder="e.g. Villa Suite A"
                    className="bg-white/5 border-white/10 h-11 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-400 text-xs font-bold">
                    Property Title *
                  </Label>
                  <Input
                    value={unitForm.title}
                    onChange={(e) =>
                      setUnitForm({ ...unitForm, title: e.target.value })
                    }
                    placeholder="e.g. Luxury Mountain Villa"
                    className="bg-white/5 border-white/10 h-11 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-400 text-xs font-bold">
                    Description
                  </Label>
                  <Textarea
                    value={unitForm.description}
                    onChange={(e) =>
                      setUnitForm({ ...unitForm, description: e.target.value })
                    }
                    placeholder="Describe this villa unit..."
                    className="bg-white/5 border-white/10 text-white min-h-[80px]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-green-400" />
                      <span className="text-gray-400">Location</span>
                    </Label>
                    <Input
                      value={unitForm.location}
                      onChange={(e) =>
                        setUnitForm({ ...unitForm, location: e.target.value })
                      }
                      placeholder="e.g. Lonavala, Maharashtra"
                      className="bg-white/5 border-white/10 h-11 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-400 text-xs font-bold">
                      Google Maps Link
                    </Label>
                    <Input
                      value={unitForm.google_maps_link}
                      onChange={(e) =>
                        setUnitForm({ ...unitForm, google_maps_link: e.target.value })
                      }
                      placeholder="https://maps.google.com/..."
                      className="bg-white/5 border-white/10 h-11 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold flex items-center gap-2">
                      <IndianRupee className="w-4 h-4 text-[#D4AF37]" />
                      <span className="text-gray-400">Weekday Price</span>
                    </Label>
                    <Input
                      type="number"
                      placeholder="Enter weekday price!"
                      min="0"
                      value={
                        unitForm.weekday_price === "0"
                          ? ""
                          : unitForm.weekday_price
                      }
                      onFocus={() => {
                        if (unitForm.weekday_price === "0") {
                          setUnitForm({ ...unitForm, weekday_price: "" });
                        }
                      }}
                      onChange={(e) =>
                        setUnitForm({
                          ...unitForm,
                          weekday_price: e.target.value.replace(/^-/g, ""),
                        })
                      }
                      className="bg-white/5 border-white/10 h-11 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold flex items-center gap-2">
                      <IndianRupee className="w-4 h-4 text-[#D4AF37]" />
                      <span className="text-gray-400">Weekend Price</span>
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="Enter weekend price!"
                      value={
                        unitForm.weekend_price === "0"
                          ? ""
                          : unitForm.weekend_price
                      }
                      onFocus={() => {
                        if (unitForm.weekend_price === "0") {
                          setUnitForm({ ...unitForm, weekend_price: "" });
                        }
                      }}
                      onChange={(e) =>
                        setUnitForm({
                          ...unitForm,
                          weekend_price: e.target.value.replace(/^-/g, ""),
                        })
                      }
                      className="bg-white/5 border-white/10 h-11 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-400 text-xs font-bold">
                      Special Price
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="Special price"
                      value={
                        unitForm.special_price === "0"
                          ? ""
                          : unitForm.special_price
                      }
                      onFocus={() => {
                        if (unitForm.special_price === "0") {
                          setUnitForm({ ...unitForm, special_price: "" });
                        }
                      }}
                      onChange={(e) =>
                        setUnitForm({
                          ...unitForm,
                          special_price: e.target.value.replace(/^-/g, ""),
                        })
                      }
                      className="bg-white/5 border-white/10 h-11 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs capitalize font-bold flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-400" />
                      <span className="text-blue-400">Max Capacity</span>
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="Max number of guests"
                      value={
                        unitForm.max_capacity === "0"
                          ? ""
                          : unitForm.max_capacity
                      }
                      onFocus={() => {
                        if (unitForm.max_capacity === "0") {
                          setUnitForm({ ...unitForm, max_capacity: "" });
                        }
                      }}
                      onChange={(e) =>
                        setUnitForm({
                          ...unitForm,
                          max_capacity: e.target.value.replace(/^-/g, ""),
                        })
                      }
                      className="bg-white/5 border-white/10 text-blue-400 font-bold h-11"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold flex items-center gap-2">
                      <Clock className="w-4 h-4 text-purple-400" />
                      <span className="text-gray-400">Check-in Time</span>
                    </Label>
                    <Input
                      value={unitForm.check_in_time}
                      onChange={(e) =>
                        setUnitForm({ ...unitForm, check_in_time: e.target.value })
                      }
                      placeholder="e.g. 2:00 PM"
                      className="bg-white/5 border-white/10 h-11 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold flex items-center gap-2">
                      <Clock className="w-4 h-4 text-purple-400" />
                      <span className="text-gray-400">Check-out Time</span>
                    </Label>
                    <Input
                      value={unitForm.check_out_time}
                      onChange={(e) =>
                        setUnitForm({ ...unitForm, check_out_time: e.target.value })
                      }
                      placeholder="e.g. 11:00 AM"
                      className="bg-white/5 border-white/10 h-11 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold flex items-center gap-2">
                      <Star className="w-4 h-4 text-yellow-400" />
                      <span className="text-gray-400">Rating</span>
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      max="5"
                      step="0.1"
                      value={unitForm.rating}
                      onChange={(e) =>
                        setUnitForm({ ...unitForm, rating: e.target.value })
                      }
                      placeholder="e.g. 4.5"
                      className="bg-white/5 border-white/10 h-11 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-400 text-xs font-bold">
                      Price Note
                    </Label>
                    <Input
                      value={unitForm.price_note}
                      onChange={(e) =>
                        setUnitForm({ ...unitForm, price_note: e.target.value })
                      }
                      placeholder="e.g. Per night, exclusive of taxes"
                      className="bg-white/5 border-white/10 h-11 text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-white/5">
                <div className="flex items-center justify-between">
                  <Label className="text-gold text-xs capitalize font-bold">
                    Special Date Prices
                  </Label>
                  <Button
                    type="button"
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
                    className="border border-gold/30 text-gold bg-transparent hover:bg-gold hover:text-black hover:border-gold transition-colors h-8"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Date
                  </Button>
                </div>

                <div className="space-y-3">
                  {unitForm.special_dates.map((sd, idx) => (
                    <div
                      key={idx}
                      className="flex gap-3 items-end bg-white/5 p-3 rounded-xl border border-white/5"
                    >
                      <div className="flex-1 space-y-2">
                        <Label className="text-[10px] text-gray-500 capitalize font-bold">
                          Date
                        </Label>
                        <Input
                          type="date"
                          value={sd.date}
                          onChange={(e) => {
                            const newDates = [...unitForm.special_dates];
                            newDates[idx].date = e.target.value;
                            setUnitForm({
                              ...unitForm,
                              special_dates: newDates,
                            });
                          }}
                          className="bg-charcoal border-white/10 h-10 text-white"
                        />
                      </div>

                      <div className="flex-1 space-y-2">
                        <Label className="text-[10px] text-gray-500 capitalize font-bold">
                          Price
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          placeholder="Special price"
                          value={sd.price}
                          onChange={(e) => {
                            const newDates = [...unitForm.special_dates];
                            newDates[idx].price = e.target.value.replace(
                              /^-/g,
                              "",
                            );
                            setUnitForm({
                              ...unitForm,
                              special_dates: newDates,
                            });
                          }}
                          className="bg-charcoal border-white/10 h-10 text-white"
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
                        className="text-red-500 hover:text-red-400 hover:bg-red-500/10 h-10 w-10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {[
                { label: "Amenities", field: "amenities" as const },
                { label: "Activities", field: "activities" as const },
                { label: "Highlights", field: "highlights" as const },
                { label: "Policies", field: "policies" as const },
              ].map((section) => (
                <div key={section.field} className="space-y-3">
                  <Label className="text-gray-400 text-xs capitalize font-bold">
                    {section.label}
                  </Label>
                  <div className="space-y-2">
                    {(unitForm[section.field] as string[]).map((val, idx) => (
                      <div key={idx} className="flex gap-2">
                        <Input
                          value={val}
                          onChange={(e) => {
                            const newArr = [...(unitForm[section.field] as string[])];
                            newArr[idx] = e.target.value;
                            setUnitForm({ ...unitForm, [section.field]: newArr });
                          }}
                          placeholder={`Add ${section.label.toLowerCase()}...`}
                          className="bg-white/5 border-white/10 h-10 text-white"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 text-red-500/50 hover:text-red-500 hover:bg-red-500/10"
                          onClick={() => {
                            const newArr = (unitForm[section.field] as string[]).filter(
                              (_, i) => i !== idx,
                            );
                            setUnitForm({
                              ...unitForm,
                              [section.field]: newArr.length ? newArr : [""],
                            });
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      size="sm"
                      className="w-full border border-dashed border-gold/30 text-gold bg-transparent hover:bg-gold hover:text-black hover:border-gold transition-colors h-10"
                      onClick={() =>
                        setUnitForm({
                          ...unitForm,
                          [section.field]: [...(unitForm[section.field] as string[]), ""],
                        })
                      }
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add {section.label}
                    </Button>
                  </div>
                </div>
              ))}

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-gray-400 text-xs capitalize font-bold">
                    Schedule
                  </Label>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() =>
                      setUnitForm({
                        ...unitForm,
                        schedule: [
                          ...unitForm.schedule,
                          { time: "", title: "" },
                        ],
                      })
                    }
                    className="border border-gold/30 text-gold bg-transparent hover:bg-gold hover:text-black hover:border-gold transition-colors h-8"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Schedule
                  </Button>
                </div>
                <div className="space-y-2">
                  {unitForm.schedule.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex gap-2 items-end bg-white/5 p-3 rounded-xl border border-white/5"
                    >
                      <div className="flex-1 space-y-2">
                        <Label className="text-[10px] text-gray-500 capitalize font-bold">
                          Time
                        </Label>
                        <Input
                          value={item.time}
                          onChange={(e) => {
                            const newSchedule = [...unitForm.schedule];
                            newSchedule[idx].time = e.target.value;
                            setUnitForm({ ...unitForm, schedule: newSchedule });
                          }}
                          placeholder="e.g. 3:00 PM"
                          className="bg-charcoal border-white/10 h-10 text-white"
                        />
                      </div>
                      <div className="flex-1 space-y-2">
                        <Label className="text-[10px] text-gray-500 capitalize font-bold">
                          Title
                        </Label>
                        <Input
                          value={item.title}
                          onChange={(e) => {
                            const newSchedule = [...unitForm.schedule];
                            newSchedule[idx].title = e.target.value;
                            setUnitForm({ ...unitForm, schedule: newSchedule });
                          }}
                          placeholder="e.g. Welcome drinks"
                          className="bg-charcoal border-white/10 h-10 text-white"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const newSchedule = unitForm.schedule.filter(
                            (_, i) => i !== idx,
                          );
                          setUnitForm({
                            ...unitForm,
                            schedule: newSchedule.length
                              ? newSchedule
                              : [{ time: "", title: "" }],
                          });
                        }}
                        className="text-red-500 hover:text-red-400 hover:bg-red-500/10 h-10 w-10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-gray-400 text-xs capitalize font-bold">
                    Unit Image Gallery ({unitForm.images.length}/20)
                  </Label>
                  <input
                    type="file"
                    id="villa-unit-img-owner"
                    className="hidden"
                    onChange={handleUnitImageUpload}
                    accept=".jpg,.jpeg,.png,.webp"
                    multiple
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      document.getElementById("villa-unit-img-owner")?.click()
                    }
                    disabled={isUploading || unitForm.images.length >= 20}
                    className="border-gold/30 text-gold h-9"
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
                className="w-full bg-[#D4AF37] hover:bg-[#B8962E] text-black font-bold h-12 rounded-xl mt-4 shadow-lg shadow-gold/10"
              >
                {editingUnit ? "Update Unit" : "Create Unit"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VillaOwnerUnits;
