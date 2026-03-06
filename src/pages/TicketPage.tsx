import React, { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Loader2, CheckCircle2, ArrowLeft, XCircle } from "lucide-react";
import { ETicket } from "@/components/ETicket";

const TicketPage = () => {
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get("booking_id");
  const ticketToken = searchParams.get("token");
  const identifier = ticketToken || bookingId;

  const hasPendingBooking = bookingId
    ? localStorage.getItem("pending_booking_id") === bookingId
    : false;

  const [verifyingPayment, setVerifyingPayment] = useState(hasPendingBooking);
  const [isBlurred, setIsBlurred] = useState(false);

  const verifyAttempts = useRef(0);
  const maxVerifyAttempts = 12;

  const returnUrl = localStorage.getItem("booking_return_url") || "/";

  const goBack = () => {
    navigate(returnUrl);
  };

  useEffect(() => {
    const preventDefault = (e: Event) => e.preventDefault();
    document.addEventListener("contextmenu", preventDefault);

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

  const {
    data: ticket,
    isLoading,
    error,
    refetch,
  } = useQuery({
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
        ticket.booking_status === "TICKET_GENERATED" ||
        ticket.booking_status === "PAYMENT_FAILED" ||
        ticket.booking_status === "CANCELLED_BY_OWNER")
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
          {verifyingPayment
            ? "Verifying your payment..."
            : "Loading your ticket..."}
        </p>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex justify-center items-center h-screen bg-[#0a0a0a]">
        <p className="text-gray-400">Ticket not found</p>
      </div>
    );
  }

  if (
    ticket.booking_status === "PENDING_OWNER_CONFIRMATION" ||
    ticket.booking_status === "BOOKING_REQUEST_SENT_TO_OWNER"
  ) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-4">
        <div className="bg-[#1a1a1a] rounded-2xl p-8 border border-[#d4af37]/20 text-center max-w-md w-full space-y-5">
          <div className="w-20 h-20 mx-auto bg-green-500/10 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-12 h-12 text-green-500" />
          </div>

          <h1 className="text-2xl font-bold text-[#d4af37]">
            Payment Successful!
          </h1>

          <p className="text-gray-400">
            Your booking is being processed. Waiting for property owner
            confirmation.
          </p>

          <div className="bg-[#111] rounded-xl p-4 space-y-3 text-left">
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
                ₹{Number(ticket.advance_amount).toLocaleString("en-IN")}
              </span>
            </div>
          </div>

          <div className="pt-2 text-center">
            <p className="text-sm text-gray-300 leading-relaxed">
              📩 Your{" "}
              <span className="text-[#d4af37] font-semibold">e-ticket</span> and
              booking confirmation will be sent to your
              <span className="text-green-400 font-semibold"> WhatsApp</span>
              {" "}within the next hour.
            </p>

            <p className="text-xs text-gray-500 mt-2">
              Please check WhatsApp for your booking details and ticket.
            </p>
          </div>

          <button
            onClick={goBack}
            className="mt-4 flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-[#d4af37] text-black font-semibold hover:bg-[#e5c04a] transition"
          >
            <ArrowLeft size={18} />
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (ticket.booking_status === "PAYMENT_FAILED") {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-4">
        <div className="bg-[#1a1a1a] rounded-2xl p-8 border border-red-500/20 text-center max-w-md w-full space-y-5">
          <div className="w-20 h-20 mx-auto bg-red-500/10 rounded-full flex items-center justify-center">
            <XCircle className="w-12 h-12 text-red-500" />
          </div>

          <h1 className="text-2xl font-bold text-red-400">Payment Failed</h1>

          <p className="text-gray-400">
            Your payment could not be processed. No amount has been charged.
          </p>

          <div className="bg-[#111] rounded-xl p-4 space-y-3 text-left">
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
          </div>

          <p className="text-sm text-gray-500">
            Please try booking again. If money was deducted, it will be refunded automatically within 5–7 business days.
          </p>

          <button
            onClick={goBack}
            className="mt-4 flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-[#d4af37] text-black font-semibold hover:bg-[#e5c04a] transition"
          >
            <ArrowLeft size={18} />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (ticket.booking_status === "CANCELLED_BY_OWNER") {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-4">
        <div className="bg-[#1a1a1a] rounded-2xl p-8 border border-red-500/20 text-center max-w-md w-full space-y-5">
          <div className="w-20 h-20 mx-auto bg-red-500/10 rounded-full flex items-center justify-center">
            <XCircle className="w-12 h-12 text-red-500" />
          </div>

          <h1 className="text-2xl font-bold text-red-400">Booking Cancelled</h1>

          <p className="text-gray-400">
            The property owner has cancelled your booking. Your advance will be refunded within 24 hours.
          </p>

          <div className="bg-[#111] rounded-xl p-4 space-y-3 text-left">
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
            {ticket.advance_amount > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500 text-sm">Refund Amount</span>
                <span className="text-yellow-400 text-sm font-bold">
                  ₹{Number(ticket.advance_amount).toLocaleString("en-IN")}
                </span>
              </div>
            )}
          </div>

          <p className="text-sm text-gray-500">
            Our team will process your refund shortly. For assistance, contact us on WhatsApp.
          </p>

          <button
            onClick={goBack}
            className="mt-4 flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-[#d4af37] text-black font-semibold hover:bg-[#e5c04a] transition"
          >
            <ArrowLeft size={18} />
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <ETicket
      bookingData={{
        propertyTitle: ticket.property_name,
        name: ticket.guest_name,
        mobile: ticket.guest_phone,
        persons: ticket.persons,
        checkIn: ticket.checkin_datetime,
        checkOut: ticket.checkout_datetime,
        totalPrice: ticket.total_amount,
        advanceAmount: ticket.advance_amount,
        mapLink: ticket.map_link,
      }}
      paymentInfo={{
        orderId: ticket.booking_id,
        transactionId: ticket.transaction_id,
        status: ticket.payment_status,
        date: ticket.created_at,
      }}
    />
  );
};

export default TicketPage;
