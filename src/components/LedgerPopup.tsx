import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { format, addDays } from "date-fns";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import {
  X,
  Plus,
  User,
  Users,
  CreditCard,
  IndianRupee,
  Loader2,
  Download,
  FileSpreadsheet,
  FileText,
  Pencil,
  Trash2,
  XCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import ExcelJS from "exceljs";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// Extend jsPDF type for autotable
//declare module 'jspdf' {
// interface jsPDF {
//    autoTable: (options: any) => jsPDF;
//  }
//}

interface LedgerPopupProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date | null;
  propertyName: string;
  propertyId: string;
  unitId?: number;
  unitName?: string;
  availablePersons: number;
  totalPersons: number;
  isVilla?: boolean;
  isAdmin?: boolean;
  onCancelSuccess?: () => void;
}

export const LedgerPopup = ({
  isOpen,
  onClose,
  date,
  propertyName,
  propertyId,
  unitId,
  unitName,
  availablePersons,
  totalPersons,
  isVilla = false,
  isAdmin = false,
  onCancelSuccess,
}: LedgerPopupProps) => {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [cancelConfirmEntry, setCancelConfirmEntry] = useState<any>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelPreview, setCancelPreview] = useState<any>(null);
  const [cancelPreviewLoading, setCancelPreviewLoading] = useState(false);

  const currentOccupancy = entries.reduce(
    (sum, entry) => sum + (entry.persons || 0),
    0,
  );
  const remainingCapacity = Math.max(0, totalPersons - currentOccupancy);

  const exportExcel = async () => {
    setIsExporting(true);
    try {
      const year = date?.getFullYear();
      const month = (date?.getMonth() || 0) + 1;
      const res = await fetch(
        `/api/bookings/ledger/monthly?property_id=${propertyId}&year=${year}&month=${month}${unitId ? `&unit_id=${unitId}` : ""}`,
      );
      const data = await res.json();

      if (!data.success) throw new Error("Failed to fetch data");

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Monthly Ledger");

      worksheet.columns = [
        { header: "Date", key: "date", width: 15 },
        { header: "Customer", key: "customer", width: 25 },
        { header: "Persons", key: "persons", width: 10 },
        { header: "Check-in", key: "checkin", width: 15 },
        { header: "Check-out", key: "checkout", width: 15 },
        { header: "Mode", key: "mode", width: 12 },
        { header: "Amount", key: "amount", width: 15 },
      ];

      data.data.forEach((entry: any) => {
        worksheet.addRow({
          date: format(new Date(entry.check_in), "dd MMM yyyy"),
          customer: entry.customer_name,
          persons: entry.persons,
          checkin: format(new Date(entry.check_in), "dd MMM yyyy"),
          checkout: format(new Date(entry.check_out), "dd MMM yyyy"),
          mode: entry.payment_mode.toUpperCase(),
          amount: entry.amount,
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Ledger_${propertyName}_${format(date!, "MMM_yyyy")}.xlsx`;
      a.click();
      toast.success("Excel exported successfully");
    } catch (error) {
      toast.error("Failed to export Excel");
    } finally {
      setIsExporting(false);
    }
  };

  const exportPDF = async () => {
    setIsExporting(true);
    try {
      const year = date?.getFullYear();
      const month = (date?.getMonth() || 0) + 1;

      const res = await fetch(
        `/api/bookings/ledger/monthly?property_id=${propertyId}&year=${year}&month=${month}${unitId ? `&unit_id=${unitId}` : ""}`,
      );

      const data = await res.json();
      if (!data.success) throw new Error("Failed to fetch data");

      const doc = new jsPDF({ orientation: "portrait", unit: "mm" });

      /* =====================================================
         MODERN HEADER
      ===================================================== */

      // Accent bar
      doc.setFillColor(218, 165, 32); // Gold
      doc.rect(0, 0, doc.internal.pageSize.width, 8, "F");

      // Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.setTextColor(30);
      doc.text("Monthly Ledger Report", 14, 22);

      // Property Name
      doc.setFont("helvetica", "normal");
      doc.setFontSize(13);
      doc.setTextColor(90);
      doc.text(propertyName, 14, 30);

      // Meta info
      doc.setFontSize(10);
      doc.setTextColor(120);
      doc.text(`Month: ${format(date!, "MMMM yyyy")}`, 14, 36);

      doc.text(
        `Generated: ${format(new Date(), "dd MMM yyyy, hh:mm a")}`,
        doc.internal.pageSize.width - 14,
        36,
        { align: "right" },
      );

      /* =====================================================
         TABLE DATA
      ===================================================== */

      const tableData = data.data.map((entry: any) => [
        format(new Date(entry.check_in), "dd MMM yyyy"),
        entry.customer_name,
        String(entry.persons),
        entry.payment_mode.toUpperCase(),
        String(entry.amount), // no ₹ symbol to avoid spacing bug
      ]);

      const totalAmount = data.data.reduce(
        (sum: number, e: any) => sum + Number(e.amount || 0),
        0,
      );

      autoTable(doc, {
        startY: 44,

        head: [["Date", "Customer", "Persons", "Payment Mode", "Amount"]],

        body: tableData,

        foot: [["", "TOTAL", "", "", String(totalAmount)]],

        theme: "striped",

        styles: {
          font: "helvetica",
          fontSize: 10,
          cellPadding: 6,
          textColor: [50, 50, 50],
        },

        headStyles: {
          fillColor: [245, 247, 250],
          textColor: [30, 30, 30],
          fontStyle: "bold",
          halign: "center",
          lineWidth: 0,
        },

        bodyStyles: {
          lineWidth: 0,
        },

        alternateRowStyles: {
          fillColor: [252, 252, 252],
        },

        footStyles: {
          fillColor: [245, 245, 245],
          textColor: [0, 0, 0],
          fontStyle: "bold",
        },

        columnStyles: {
          2: { halign: "center" }, // Persons
          4: { halign: "right" }, // Amount
        },

        margin: { left: 14, right: 14 },
      });

      /* =====================================================
         FOOTER (PAGE NUMBERS + BRANDING)
      ===================================================== */

      const pageCount = doc.getNumberOfPages();
      const pageHeight = doc.internal.pageSize.height;

      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);

        doc.setFontSize(9);
        doc.setTextColor(150);

        doc.text(
          `Page ${i} of ${pageCount}`,
          doc.internal.pageSize.width / 2,
          pageHeight - 10,
          { align: "center" },
        );

        doc.text("Powered by PawnaHaven Booking System", 14, pageHeight - 10);
      }

      /* =====================================================
         SAVE
      ===================================================== */

      doc.save(`Ledger_${propertyName}_${format(date!, "MMM_yyyy")}.pdf`);
      toast.success("PDF exported successfully");
    } catch (error) {
      console.error(error);
      toast.error("Failed to export PDF");
    } finally {
      setIsExporting(false);
    }
  };

  // Form State
  const [formData, setFormData] = useState({
    customer_name: "",
    persons: "",
    payment_mode: "offline",
    amount: "",
    check_in: "",
    check_out: "",
  });

  const editingPersons = editingEntry ? editingEntry.persons || 0 : 0;
  const effectiveOccupancy = currentOccupancy - editingPersons;
  const maxAllowedPersons = isVilla
    ? entries.length === 0 || editingEntry
      ? totalPersons
      : 0
    : Math.max(0, totalPersons - effectiveOccupancy);
  const enteredPersons = parseInt(formData.persons) || 0;
  const personsExceeded =
    formData.persons !== "" &&
    (enteredPersons > maxAllowedPersons || enteredPersons < 1);

  useEffect(() => {
    if (isOpen && date) {
      fetchEntries();
      setFormData((prev) => ({
        ...prev,
        check_in: format(date, "yyyy-MM-dd"),
        check_out: format(addDays(date, 1), "yyyy-MM-dd"),
      }));
    }
  }, [isOpen, date]);

  const fetchEntries = async () => {
    if (!date) return;
    setLoading(true);
    try {
      const dateStr = format(date, "yyyy-MM-dd");
      const url = `/api/bookings/ledger?property_id=${propertyId}&date=${dateStr}${unitId ? `&unit_id=${unitId}` : ""}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setEntries(data.data);
      }
    } catch (error) {
      console.error("Error fetching entries:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCancelModal = (entry: any) => {
    setCancelPreview(null);
    onClose();
    setTimeout(async () => {
      setCancelConfirmEntry(entry);
      if (!entry.booking_id) return;
      setCancelPreviewLoading(true);
      try {
        const token = localStorage.getItem('adminToken');
        const r = await fetch(`/api/bookings/cancel-preview/${entry.booking_id}`, {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        });
        const data = await r.json();
        if (r.ok) setCancelPreview(data);
      } catch {
      } finally {
        setCancelPreviewLoading(false);
      }
    }, 200);
  };

  const handleAdminCancel = async (bookingId: string) => {
    setCancelLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      await fetch('/api/bookings/admin-cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ booking_id: bookingId }),
      }).then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || 'Failed to cancel booking');
        return data;
      });
      toast.success('Booking cancelled successfully');
      setCancelConfirmEntry(null);
      setCancelPreview(null);
      fetchEntries();
      onCancelSuccess?.();
    } catch (e: any) {
      toast.error(e.message || 'Failed to cancel booking');
    } finally {
      setCancelLoading(false);
    }
  };

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url = editingEntry
        ? `/api/bookings/ledger/${editingEntry.id}`
        : "/api/bookings/ledger";
      const method = editingEntry ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          property_id: propertyId,
          unit_id: unitId || null,
          persons: parseInt(formData.persons),
          amount: parseFloat(formData.amount),
        }),
      });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.message || "Failed to save entry");
        return;
      }
      if (data.success) {
        toast.success(
          editingEntry
            ? "Entry updated successfully"
            : "Entry added successfully",
        );
        setShowAddForm(false);
        setEditingEntry(null);
        fetchEntries();
        // Notify parent component to refresh calendar
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("calendarUpdate"));
        }
        setFormData({
          customer_name: "",
          persons: "",
          payment_mode: "offline",
          amount: "",
          check_in: format(date!, "yyyy-MM-dd"),
          check_out: format(addDays(date!, 1), "yyyy-MM-dd"),
        });
      }
    } catch (error) {
      toast.error(
        editingEntry ? "Failed to update entry" : "Failed to add entry",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (entry: any) => {
    setEditingEntry(entry);
    setFormData({
      customer_name: entry.customer_name,
      persons: entry.persons.toString(),
      payment_mode: entry.payment_mode,
      amount: entry.amount.toString(),
      check_in: format(new Date(entry.check_in), "yyyy-MM-dd"),
      check_out: format(new Date(entry.check_out), "yyyy-MM-dd"),
    });
    setShowAddForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this entry?")) return;
    try {
      const res = await fetch(`/api/bookings/ledger/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Entry deleted");
        fetchEntries();
      }
    } catch (error) {
      toast.error("Failed to delete entry");
    }
  };

  if (!date) return null;

  return (
    <>
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent className="bg-charcoal border-white/10 rounded-t-[2rem] max-h-[90vh]">
        <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-white/10 my-4" />

        <DrawerHeader className="px-6">
          <div className="flex justify-between items-start">
            <div className="space-y-1 text-left">
              <DrawerTitle className="text-gold font-display text-2xl tracking-tight">
                {unitName || propertyName}
              </DrawerTitle>
              <DrawerDescription className="text-white/60 font-medium">
                {format(date, "dd MMM yyyy")}
              </DrawerDescription>
            </div>
            <DrawerClose asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-white/60 hover:text-white hover:bg-white/5 rounded-full"
              >
                <X className="w-5 h-5" />
              </Button>
            </DrawerClose>
          </div>
        </DrawerHeader>

        <div className="px-6 overflow-y-auto pb-10">
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10 flex items-center justify-between mb-6">
            <div className="space-y-1">
              <p className="text-[10px] capatalize font-bold text-white/60 tracking-wider">
                {isVilla ? "Status" : "Unit Availability"}
              </p>
              <div className="flex items-center gap-2">
                {isVilla ? (
                  entries.length > 0 ? (
                    <span className="text-xl font-black text-[#FF0000] capatalize tracking-wider">
                      Booked
                    </span>
                  ) : (
                    <span className="text-xl font-black text-[#00FF41] capatalize tracking-wider">
                      Available
                    </span>
                  )
                ) : (
                  <>
                    <span className="text-2xl font-black text-[#00FF41]">
                      {remainingCapacity}
                    </span>
                    <span className="text-white/20 text-xl font-light">/</span>
                    <span className="text-xl font-bold text-[#FFA500]">
                      {totalPersons}
                    </span>
                    <span className="text-white/60 text-xs ml-1">Persons</span>
                  </>
                )}
              </div>
              {isVilla && (
                <p className="text-[10px] text-white/60 font-bold capatalize mt-1">
                  {totalPersons} Persons Max Capacity
                </p>
              )}
            </div>
            <Button
              onClick={() => setShowAddForm(!showAddForm)}
              disabled={
                ((isVilla && entries.length > 0) ||
                  (!isVilla && remainingCapacity <= 0)) &&
                !showAddForm
              }
              className="bg-gold hover:bg-gold/80 text-black font-bold rounded-full h-10 px-4 gap-2"
            >
              <Plus className="w-4 h-4" />
              {showAddForm ? "Cancel" : "Add Entry"}
            </Button>
          </div>

          {showAddForm ? (
            <form
              onSubmit={handleAddEntry}
              className="space-y-4 bg-white/5 p-4 rounded-2xl border border-gold/20 animate-in fade-in slide-in-from-top-2"
            >
              <div className="space-y-2">
                <label className="text-xs font-bold text-white/60 capatalize px-1">
                  Customer Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                  <Input
                    required
                    value={formData.customer_name}
                    onChange={(e) =>
                      setFormData((f) => ({
                        ...f,
                        customer_name: e.target.value,
                      }))
                    }
                    className="bg-black/40 border-white/10 pl-10 h-11 text-white"
                    placeholder="Full Name"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/60 capatalize px-1">
                    Persons{" "}
                    {maxAllowedPersons > 0 && (
                      <span className="text-white/20">
                        (max {maxAllowedPersons})
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                    <Input
                      required
                      type="number"
                      min={1}
                      max={maxAllowedPersons}
                      value={formData.persons}
                      placeholder="Count"
                      onWheel={(e) => e.currentTarget.blur()}
                      onKeyDown={(e) => {
                        if (e.key === "-" || e.key === "e") {
                          e.preventDefault();
                        }
                      }}
                      onChange={(e) => {
                        const raw = e.target.value;

                        // allow empty while typing
                        if (raw === "") {
                          setFormData((f) => ({ ...f, persons: "" }));
                          return;
                        }

                        // only digits
                        if (!/^\d+$/.test(raw)) return;

                        setFormData((f) => ({ ...f, persons: raw }));
                      }}
                      onBlur={() => {
                        if (!formData.persons) {
                          setFormData((f) => ({ ...f, persons: "" }));
                          return;
                        }

                        let value = Number(formData.persons);

                        if (value < 1) value = 1;
                        if (value > maxAllowedPersons)
                          value = maxAllowedPersons;

                        setFormData((f) => ({ ...f, persons: String(value) }));
                      }}
                      className={`bg-black/40 pl-10 h-11 text-white ${
                        formData.persons && personsExceeded
                          ? "border-red-500 ring-1 ring-red-500"
                          : "border-white/10"
                      }`}
                    />
                  </div>
                  {formData.persons && personsExceeded && (
                    <p className="text-red-400 text-[10px] font-bold px-1">
                      {enteredPersons < 1
                        ? "Minimum 1 person required"
                        : `Exceeds available capacity (${maxAllowedPersons})`}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/60 capatalize px-1">
                    Amount
                  </label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                    <Input
                      required
                      type="number"
                      min={0}
                      step={1}
                      value={formData.amount}
                      placeholder="Price"
                      onWheel={(e) => e.currentTarget.blur()}
                      onKeyDown={(e) => {
                        if (e.key === "-" || e.key === "e") {
                          e.preventDefault();
                        }
                      }}
                      onChange={(e) => {
                        const raw = e.target.value;

                        // allow empty while typing
                        if (raw === "") {
                          setFormData((f) => ({ ...f, amount: "" }));
                          return;
                        }

                        // only digits
                        if (!/^\d+$/.test(raw)) return;

                        setFormData((f) => ({ ...f, amount: raw }));
                      }}
                      onBlur={() => {
                        if (!formData.amount) {
                          setFormData((f) => ({ ...f, amount: "" }));
                          return;
                        }

                        let value = Number(formData.amount);
                        if (value < 0) value = 0;

                        setFormData((f) => ({ ...f, amount: String(value) }));
                      }}
                      className="bg-black/40 border-white/10 pl-10 h-11 text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-white/60 capatalize px-1">
                  Payment Mode
                </label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 z-10" />
                  <Select
                    value={formData.payment_mode}
                    onValueChange={(v) =>
                      setFormData((f) => ({ ...f, payment_mode: v }))
                    }
                  >
                    <SelectTrigger className="bg-black/40 border-white/10 pl-10 h-11 text-white">
                      <SelectValue placeholder="Mode" />
                    </SelectTrigger>
                    <SelectContent className="bg-charcoal border-white/10 text-white">
                      <SelectItem value="online">Online</SelectItem>
                      <SelectItem value="offline">
                        Offline (Cash/UPI)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/60 capatalize px-1">
                    Check-in
                  </label>
                  <Input
                    type="date"
                    value={formData.check_in}
                    readOnly
                    tabIndex={-1}
                    className="
                      w-full h-11 px-3 rounded-md
                      bg-black/40 border border-white/10
                      text-white text-sm
                      cursor-not-allowed opacity-70
                      [&::-webkit-calendar-picker-indicator]:pointer-events-none
                    "
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/60 capatalize px-1">
                    Check-out
                  </label>
                  <Input
                    type="date"
                    value={formData.check_out}
                    readOnly
                    tabIndex={-1}
                    className="
                      w-full h-11 px-3 rounded-md
                      bg-black/40 border border-white/10
                      text-white text-sm
                      cursor-not-allowed opacity-70
                      [&::-webkit-calendar-picker-indicator]:pointer-events-none
                    "
                  />
                </div>
              </div>

              <Button
                disabled={
                  isSubmitting || (!!formData.persons && personsExceeded)
                }
                className="w-full bg-gold hover:bg-gold/80 text-black font-black h-12 rounded-xl mt-4 disabled:opacity-40"
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "Save Entry"
                )}
              </Button>
            </form>
          ) : (
            <div className="space-y-3">
              <h3 className="text-xs font-black text-white/20 capatalize tracking-[0.2em] px-1">
                Bookings List
              </h3>
              {loading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-8 h-8 text-gold animate-spin" />
                </div>
              ) : entries.length === 0 ? (
                <div className="text-center py-10 bg-white/5 rounded-2xl border border-dashed border-white/10">
                  <p className="text-white/60 text-sm italic">
                    No bookings found for this date
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {entries.map((entry, i) => {
                    const isCancelled = entry.booking_status === 'CANCELLED';
                    return (
                    <div
                      key={entry.id ?? `b-${i}`}
                      className={`rounded-2xl p-4 flex items-center justify-between ${
                        isCancelled
                          ? 'bg-red-900/20 border border-red-500/30'
                          : 'bg-white/5 border border-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold ${
                          isCancelled ? 'bg-red-500/10 text-red-400' : 'bg-gold/10 text-gold'
                        }`}>
                          #{i + 1}
                        </div>
                        <div>
                          <p className={`font-bold ${isCancelled ? 'text-red-300' : 'text-white'}`}>
                            {entry.customer_name}
                          </p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[10px] text-white/60 flex items-center gap-1">
                              <Users className="w-3 h-3" /> {entry.persons}
                            </span>
                            <span className="text-[10px] text-white/60 flex items-center gap-1 capatalize tracking-wider">
                              <CreditCard className="w-3 h-3" />{" "}
                              {entry.payment_mode}
                            </span>
                            {entry.source === 'website' && !isCancelled && (
                              <span className="text-[9px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full font-bold tracking-wider">
                                ONLINE
                              </span>
                            )}
                            {isCancelled && (
                              <span className="text-[9px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full font-bold tracking-wider">
                                CANCELLED
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className={`font-black ${isCancelled ? 'text-red-400 line-through' : 'text-gold'}`}>
                            ₹{entry.amount}
                          </p>
                          <p className="text-[8px] text-white/20 capatalize font-bold tracking-tighter mt-1">
                            {format(new Date(entry.check_in), "dd MMM")} -{" "}
                            {format(new Date(entry.check_out), "dd MMM")}
                          </p>
                        </div>
                        {entry.source !== 'website' && (
                          <div className="flex flex-col gap-2 border-l border-white/10 pl-3">
                            <button
                              onClick={() => handleEdit(entry)}
                              className="text-white/60 hover:text-gold transition-colors"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(entry.id)}
                              className="text-white/60 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                        {isAdmin && !!entry.booking_id && !isCancelled && (
                          <div className="border-l border-white/10 pl-3">
                            <button
                              onClick={() => handleOpenCancelModal(entry)}
                              className="text-red-400 hover:text-red-300 transition-colors"
                              title="Cancel Booking"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <DrawerFooter className="px-6 pb-10">
          <div className="flex flex-col gap-3 w-full">
            <div className="flex gap-2 w-full">
              <Button
                onClick={exportExcel}
                disabled={isExporting}
                variant="outline"
                className="flex-1 bg-white/5 border-white/10 text-white gap-2 hover:bg-white/10"
              >
                <FileSpreadsheet className="w-4 h-4 text-[#217346]" />
                Excel
              </Button>
              <Button
                onClick={exportPDF}
                disabled={isExporting}
                variant="outline"
                className="flex-1 bg-white/5 border-white/10 text-white gap-2 hover:bg-white/10"
              >
                <FileText className="w-4 h-4 text-[#E44032]" />
                PDF
              </Button>
            </div>
            <p className="text-center text-[10px] text-white/30 capatalize font-bold tracking-[0.2em]">
              Daily Booking Ledger
            </p>
          </div>
        </DrawerFooter>
      </DrawerContent>

    </Drawer>

    {cancelConfirmEntry && createPortal(
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center px-4"
        onClick={() => { setCancelConfirmEntry(null); setCancelPreview(null); }}
      >
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
        <div
          className="relative bg-[#1A1A1A] border border-red-500/30 rounded-3xl p-6 max-w-sm w-full shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-400" />
            </div>
            <h3 className="text-base font-bold text-white">Cancel Booking?</h3>
          </div>

          {cancelPreviewLoading && (
            <div className="flex items-center justify-center py-4 mb-4">
              <Loader2 className="w-5 h-5 animate-spin text-white/40" />
              <span className="text-xs text-white/40 ml-2">Calculating refund...</span>
            </div>
          )}

          {!cancelPreviewLoading && cancelPreview && cancelPreview.has_policy && (
            <div className="mb-4 rounded-2xl overflow-hidden border border-white/10">
              <div className="px-4 py-2 bg-white/5 border-b border-white/10">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Cancellation Policy</p>
              </div>
              <div className="px-4 py-3 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-white/60">Days before check-in</span>
                  <span className="text-xs font-bold text-white">{cancelPreview.days_before_checkin} day{cancelPreview.days_before_checkin !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-white/60">Advance paid</span>
                  <span className="text-xs font-bold text-white">₹{(cancelPreview.advance_amount || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-white/40">Total booking value</span>
                  <span className="text-xs text-white/40">₹{(cancelPreview.total_amount || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className={`mt-2 rounded-xl px-3 py-2 flex justify-between items-center ${
                  cancelPreview.refund_case === 1 ? 'bg-green-500/10 border border-green-500/30' :
                  cancelPreview.refund_case === 2 ? 'bg-yellow-500/10 border border-yellow-500/30' :
                  'bg-red-500/10 border border-red-500/30'
                }`}>
                  <div>
                    <p className={`text-[10px] font-bold uppercase tracking-widest ${
                      cancelPreview.refund_case === 1 ? 'text-green-400' :
                      cancelPreview.refund_case === 2 ? 'text-yellow-400' :
                      'text-red-400'
                    }`}>{cancelPreview.label}</p>
                    <p className="text-[10px] text-white/40 mt-0.5">
                      {cancelPreview.refund_case === 1 && 'Customer receives full refund'}
                      {cancelPreview.refund_case === 2 && '50% to customer · 50% to owner'}
                      {cancelPreview.refund_case === 3 && 'No refund · Full amount to owner'}
                    </p>
                  </div>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-xs text-white/60">Customer refund</span>
                  <span className={`text-xs font-bold ${cancelPreview.refund_case === 1 ? 'text-green-400' : cancelPreview.refund_case === 2 ? 'text-yellow-400' : 'text-red-400'}`}>
                    ₹{(cancelPreview.refund_amount || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-white/60">Owner payout</span>
                  <span className={`text-xs font-bold ${cancelPreview.owner_amount > 0 ? 'text-emerald-400' : 'text-white/40'}`}>
                    ₹{(cancelPreview.owner_amount || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          )}

          {!cancelPreviewLoading && cancelPreview && !cancelPreview.has_policy && (
            <div className="mb-4 rounded-2xl px-4 py-3 bg-white/5 border border-white/10">
              <p className="text-xs text-white/60 leading-relaxed">No cancellation policy is set for this property. The booking will be cancelled and 25% of the total amount will be credited to the owner as compensation.</p>
            </div>
          )}

          {!cancelPreviewLoading && !cancelPreview && (
            <p className="text-xs text-gray-400 mb-4 leading-relaxed">
              Are you sure you want to cancel this booking? This action cannot be undone.
            </p>
          )}

          <p className="text-[10px] text-gray-600 mb-5 leading-relaxed">
            WhatsApp notifications will be sent to the guest, owner, and admin.
          </p>

          <div className="flex gap-3">
            <button
              onClick={() => { setCancelConfirmEntry(null); setCancelPreview(null); }}
              className="flex-1 h-11 rounded-2xl bg-[#2A2A2A] border border-white/10 text-white text-xs font-bold uppercase tracking-widest active:scale-95 transition-all"
            >
              Keep Booking
            </button>
            <button
              onClick={() => handleAdminCancel(cancelConfirmEntry.booking_id)}
              disabled={cancelLoading || cancelPreviewLoading}
              className="flex-1 h-11 rounded-2xl bg-red-500/20 border border-red-500/50 text-red-400 text-xs font-bold uppercase tracking-widest active:scale-95 transition-all disabled:opacity-50"
            >
              {cancelLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mx-auto" />
              ) : (
                'Cancel Booking'
              )}
            </button>
          </div>
        </div>
      </div>,
      document.body
    )}
    </>
  );
};
