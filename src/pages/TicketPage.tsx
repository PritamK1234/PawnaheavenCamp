import React, { useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Calendar, Clock, User, Phone, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

const TicketPage = () => {
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get("booking_id");
  const ticketToken = searchParams.get("token");
  const identifier = ticketToken || bookingId;
  const hasPendingBooking = bookingId ? localStorage.getItem("pending_booking_id") === bookingId : false;
  const [verifyingPayment, setVerifyingPayment] = useState(hasPendingBooking);
  const [isBlurred, setIsBlurred] = useState(false);
  const verifyAttempts = useRef(0);
  const maxVerifyAttempts = 12;

  // Screenshot prevention
  useEffect(() => {
    const preventDefault = (e: Event) => e.preventDefault();

    // Disable right-click
    document.addEventListener("contextmenu", preventDefault);

    // Disable print shortcuts and common screenshot combos
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "PrintScreen" ||
        (e.ctrlKey && (e.key === "p" || e.key === "P")) ||
        (e.ctrlKey && (e.key === "s" || e.key === "S")) ||
        (e.ctrlKey && e.shiftKey && (e.key === "i" || e.key === "I"))
      ) {
        e.preventDefault();
      }
    };
    document.addEventListener("keydown", handleKeyDown);

    // Blur ticket on visibility change (tab switch / window minimize)
    const handleVisibility = () => {
      setIsBlurred(document.visibilityState === "hidden");
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      document.removeEventListener("contextmenu", preventDefault);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  const apiUrl = ticketToken
    ? `/api/etickets/booking?token=${ticketToken}`
    : `/api/etickets/booking?booking_id=${bookingId}`;

  const { data: ticket, isLoading, error, refetch } = useQuery({
    queryKey: ["ticket", identifier],
    queryFn: async () => {
      const response = await fetch(apiUrl, {
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch ticket");
      }

      return response.json();
    },
    enabled: !!identifier,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (
        data &&
        (data.booking_status === "PENDING_OWNER_CONFIRMATION" ||
          data.booking_status === "BOOKING_REQUEST_SENT_TO_OWNER")
      ) {
        return 10000;
      }
      return false;
    },
  });

  useEffect(() => {
    if (!bookingId) return;

    const isPending = localStorage.getItem("pending_booking_id") === bookingId;
    if (!isPending) return;

    if (
      ticket &&
      (ticket.payment_status === "SUCCESS" ||
        ticket.booking_status === "PENDING_OWNER_CONFIRMATION" ||
        ticket.booking_status === "OWNER_CONFIRMED" ||
        ticket.booking_status === "TICKET_GENERATED")
    ) {
      localStorage.removeItem("pending_booking_id");
      localStorage.removeItem("pending_booking_time");
      return;
    }

    setVerifyingPayment(true);
    const verifyPayment = async () => {
      try {
        const response = await fetch(`/api/payments/verify/${bookingId}`);
        const data = await response.json();

        if (data.success && data.payment_status === "SUCCESS") {
          localStorage.removeItem("pending_booking_id");
          localStorage.removeItem("pending_booking_time");
          setVerifyingPayment(false);
          refetch();
          return;
        }

        if (data.payment_status === "FAILED") {
          localStorage.removeItem("pending_booking_id");
          localStorage.removeItem("pending_booking_time");
          setVerifyingPayment(false);
          refetch();
          return;
        }
      } catch (err) {
        console.error("Payment verification error:", err);
      }

      verifyAttempts.current++;
      if (verifyAttempts.current >= maxVerifyAttempts) {
        setVerifyingPayment(false);
        localStorage.removeItem("pending_booking_id");
        localStorage.removeItem("pending_booking_time");
      }
    };

    verifyPayment();
    const interval = setInterval(() => {
      if (verifyAttempts.current >= maxVerifyAttempts) {
        clearInterval(interval);
        return;
      }
      verifyPayment();
    }, 5000);

    return () => clearInterval(interval);
  }, [bookingId, ticket, refetch]);

  if (!identifier) {
    return (
      <div className="flex flex-col justify-center items-center h-screen space-y-4 bg-[#0a0a0a] px-4">
        <AlertCircle className="w-16 h-16 text-red-500" />
        <h1 className="text-2xl font-bold text-red-500">Invalid Request</h1>
        <p className="text-gray-400">No booking ID or token provided</p>
      </div>
    );
  }

  if (isLoading || verifyingPayment) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-[#0a0a0a] space-y-4">
        <Loader2 className="w-12 h-12 text-[#d4af37] animate-spin" />
        <p className="text-gray-400">
          {verifyingPayment ? "Verifying your payment..." : "Loading your ticket..."}
        </p>
        {verifyingPayment && (
          <p className="text-gray-500 text-sm">
            This may take a few seconds. Please don't close this page.
          </p>
        )}
      </div>
    );
  }

  if (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Error loading ticket";

    if (errorMessage.includes("expired")) {
      return (
        <div className="flex flex-col justify-center items-center h-screen space-y-4 bg-[#0a0a0a] px-4">
          <AlertCircle className="w-16 h-16 text-red-500" />
          <h1 className="text-2xl font-bold text-red-500">Booking Expired</h1>
          <p className="text-gray-400 text-center">
            This booking has expired as the checkout date has passed.
          </p>
        </div>
      );
    }

    if (
      errorMessage.includes("not available") ||
      errorMessage.includes("not yet available")
    ) {
      return (
        <div className="flex flex-col justify-center items-center h-screen space-y-4 bg-[#0a0a0a] px-4">
          <Loader2 className="w-16 h-16 text-[#d4af37] animate-spin" />
          <h1 className="text-2xl font-bold text-[#d4af37]">
            Awaiting Confirmation
          </h1>
          <p className="text-gray-400 text-center max-w-sm">
            Your payment was successful! Waiting for property owner confirmation.
            You will receive your e-ticket shortly.
          </p>
          <p className="text-gray-500 text-sm">
            This page auto-refreshes every 10 seconds
          </p>
        </div>
      );
    }

    return (
      <div className="flex flex-col justify-center items-center h-screen space-y-4 bg-[#0a0a0a] px-4">
        <AlertCircle className="w-16 h-16 text-red-500" />
        <h1 className="text-2xl font-bold text-red-500">Error</h1>
        <p className="text-gray-400 text-center">{errorMessage}</p>
      </div>
    );
  }

  if (!ticket)
    return (
      <div className="flex justify-center items-center h-screen bg-[#0a0a0a]">
        <p className="text-gray-400">Ticket not found</p>
      </div>
    );

  if (
    ticket.booking_status === "PENDING_OWNER_CONFIRMATION" ||
    ticket.booking_status === "BOOKING_REQUEST_SENT_TO_OWNER"
  ) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-4 space-y-6">
        <div className="bg-[#1a1a1a] rounded-2xl p-8 border border-[#d4af37]/20 text-center max-w-md w-full space-y-4">
          <div className="w-20 h-20 mx-auto bg-[#d4af37]/10 rounded-full flex items-center justify-center">
            <Loader2 className="w-10 h-10 text-[#d4af37] animate-spin" />
          </div>
          <h1 className="text-2xl font-bold text-[#d4af37]">
            Payment Successful!
          </h1>
          <p className="text-gray-400">
            Your booking is being processed. Waiting for property owner
            confirmation.
          </p>
          <div className="bg-[#111] rounded-xl p-4 space-y-2 text-left">
            <div className="flex justify-between">
              <span className="text-gray-500 text-sm">Booking ID</span>
              <span className="text-white text-sm font-mono">
                {ticket.booking_id}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 text-sm">Property</span>
              <span className="text-white text-sm">{ticket.property_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 text-sm">Advance Paid</span>
              <span className="text-green-400 text-sm font-bold">
                ₹{ticket.advance_amount}
              </span>
            </div>
          </div>
          <p className="text-gray-500 text-xs">
            You will receive your e-ticket within 1 hour. This page
            auto-refreshes.
          </p>
        </div>
      </div>
    );
  }

  const isExpired = new Date() > new Date(ticket.checkout_datetime);

  if (isExpired) {
    return (
      <div className="flex flex-col justify-center items-center h-screen space-y-4 bg-[#0a0a0a] px-4">
        <AlertCircle className="w-16 h-16 text-red-500" />
        <h1 className="text-2xl font-bold text-red-500">Ticket Expired</h1>
        <p className="text-gray-400 text-center">
          This ticket is no longer valid as the checkout date has passed.
        </p>
      </div>
    );
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      time: date.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }),
    };
  };

  const checkin = formatDateTime(ticket.checkin_datetime);
  const checkout = formatDateTime(ticket.checkout_datetime);

  return (
    <>
      <style>{`
        @media print { body { display: none !important; } }
      `}</style>
      <div
        className="min-h-screen bg-[#0a0a0a] py-8 px-4 sm:px-6 lg:px-8 flex flex-col items-center"
        style={{
          filter: isBlurred ? "blur(12px)" : "none",
          transition: "filter 0.2s ease",
          userSelect: "none",
          WebkitUserSelect: "none",
        }}
      >
        <Card className="w-full max-w-md shadow-2xl border border-[#d4af37]/20 bg-[#1a1a1a] overflow-hidden relative">
          {/* Watermark overlay */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              zIndex: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transform: "rotate(-30deg)",
            }}
          >
            <span
              style={{
                fontSize: "13px",
                color: "rgba(212,175,55,0.08)",
                fontWeight: 700,
                letterSpacing: "0.1em",
                whiteSpace: "nowrap",
                userSelect: "none",
                WebkitUserSelect: "none",
              }}
            >
              CONFIDENTIAL – {ticket.booking_id}
            </span>
          </div>

          <div className="bg-gradient-to-r from-[#d4af37] to-[#b8962e] p-6 text-center">
            <h1 className="text-2xl font-extrabold tracking-tight text-black mb-1">
              {ticket.property_name}
            </h1>
            <div className="flex items-center justify-center gap-2 text-sm text-black/70">
              <CheckCircle2 className="w-4 h-4 text-green-800" />
              Confirmed Booking
            </div>
          </div>

          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-gray-500 uppercase font-semibold">
                  Booking ID
                </p>
                <p className="font-mono font-medium text-xs text-white">
                  {ticket.booking_id}
                </p>
              </div>
              <div className="space-y-1 text-right">
                <p className="text-xs text-gray-500 uppercase font-semibold">
                  Guest Name
                </p>
                <p className="font-medium flex items-center justify-end gap-1 text-white">
                  <User className="w-3 h-3" /> {ticket.guest_name}
                </p>
              </div>
            </div>

            <div className="space-y-4 py-4 border-y border-dashed border-gray-700">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 uppercase font-semibold flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Check-in
                  </p>
                  <p className="font-semibold text-white">{checkin.date}</p>
                  <p className="text-sm flex items-center gap-1 text-gray-400">
                    <Clock className="w-3 h-3" /> {checkin.time}
                  </p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-xs text-gray-500 uppercase font-semibold flex items-center justify-end gap-1">
                    <Calendar className="w-3 h-3" /> Check-out
                  </p>
                  <p className="font-semibold text-white">{checkout.date}</p>
                  <p className="text-sm flex items-center justify-end gap-1 text-gray-400">
                    <Clock className="w-3 h-3" /> {checkout.time}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-[#111] rounded-xl p-4 flex justify-between items-center">
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold">
                  Advance Paid
                </p>
                <p className="text-lg font-bold text-green-400">
                  ₹{ticket.advance_amount}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 uppercase font-semibold">
                  Due Amount
                </p>
                <p className="text-3xl font-black text-[#d4af37] tracking-tighter">
                  ₹{ticket.due_amount}
                </p>
              </div>
            </div>

            <div className="space-y-4 pt-2">
              {ticket.map_link && (
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-[#111] rounded-lg">
                    <MapPin className="w-5 h-5 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-semibold">
                      Location
                    </p>
                    <a
                      href={ticket.map_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#d4af37] hover:underline font-medium text-sm"
                    >
                      View on Google Maps
                    </a>
                    {ticket.property_address && (
                      <p className="text-sm text-gray-400 mt-1">
                        {ticket.property_address}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <div className="p-2 bg-[#111] rounded-lg">
                  <Phone className="w-5 h-5 text-gray-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold">
                    Host Details
                  </p>
                  <p className="font-medium text-sm text-white">
                    {ticket.owner_name || "Property Owner"}
                  </p>
                  <p className="text-sm text-gray-400">{ticket.owner_phone}</p>
                </div>
              </div>
            </div>

            <div className="pt-6 flex flex-col items-center border-t border-dashed border-gray-700 gap-4">
              <QRCodeSVG
                value={window.location.href}
                size={128}
                level="H"
                bgColor="transparent"
                fgColor="#d4af37"
              />
              <p className="text-[10px] text-gray-500 uppercase tracking-widest">
                Scan to verify ticket
              </p>
            </div>
          </CardContent>
        </Card>

        <p className="mt-8 text-xs text-gray-500 text-center max-w-xs">
          Please present this e-ticket at the time of check-in. This is a
          read-only document and cannot be modified.
        </p>
      </div>
    </>
  );
};

export default TicketPage;
