import React, { useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Loader2 } from "lucide-react";
import { ETicket } from "@/components/ETicket";

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

  useEffect(() => {
    const preventDefault = (e: Event) => e.preventDefault();
    document.addEventListener("contextmenu", preventDefault);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "PrintScreen" ||
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
    const errorMessage = error instanceof Error ? error.message : "Error loading ticket";

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

    if (errorMessage.includes("not available") || errorMessage.includes("not yet available")) {
      return (
        <div className="flex flex-col justify-center items-center h-screen space-y-4 bg-[#0a0a0a] px-4">
          <Loader2 className="w-16 h-16 text-[#d4af37] animate-spin" />
          <h1 className="text-2xl font-bold text-[#d4af37]">Awaiting Confirmation</h1>
          <p className="text-gray-400 text-center max-w-sm">
            Your payment was successful! Waiting for property owner confirmation.
            You will receive your e-ticket shortly.
          </p>
          <p className="text-gray-500 text-sm">This page auto-refreshes every 10 seconds</p>
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
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-4 space-y-6">
        <div className="bg-[#1a1a1a] rounded-2xl p-8 border border-[#d4af37]/20 text-center max-w-md w-full space-y-4">
          <div className="w-20 h-20 mx-auto bg-[#d4af37]/10 rounded-full flex items-center justify-center">
            <Loader2 className="w-10 h-10 text-[#d4af37] animate-spin" />
          </div>
          <h1 className="text-2xl font-bold text-[#d4af37]">Payment Successful!</h1>
          <p className="text-gray-400">
            Your booking is being processed. Waiting for property owner confirmation.
          </p>
          <div className="bg-[#111] rounded-xl p-4 space-y-2 text-left">
            <div className="flex justify-between">
              <span className="text-gray-500 text-sm">Booking ID</span>
              <span className="text-white text-sm font-mono">{ticket.booking_id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 text-sm">Property</span>
              <span className="text-white text-sm">{ticket.property_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 text-sm">Advance Paid</span>
              <span className="text-green-400 text-sm font-bold">₹{ticket.advance_amount}</span>
            </div>
          </div>
          <p className="text-gray-500 text-xs">
            You will receive your e-ticket within 1 hour. This page auto-refreshes.
          </p>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const bookingData = {
    propertyTitle: ticket.property_name,
    name: ticket.guest_name,
    mobile: ticket.guest_phone,
    persons: ticket.persons || 0,
    checkIn: formatDate(ticket.checkin_datetime),
    checkOut: formatDate(ticket.checkout_datetime),
    totalPrice: parseFloat(ticket.total_amount) || 0,
    advanceAmount: parseFloat(ticket.advance_amount) || 0,
    mapLink: ticket.map_link || undefined,
  };

  const paymentInfo = {
    orderId: ticket.booking_id,
    transactionId: ticket.transaction_id || ticket.order_id || "-",
    status: ticket.payment_status || "SUCCESS",
    date: formatDate(ticket.created_at),
  };

  return (
    <div
      className="min-h-screen bg-[#f0f0f0] py-6"
      style={{
        filter: isBlurred ? "blur(12px)" : "none",
        transition: "filter 0.2s ease",
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
    >
      <ETicket bookingData={bookingData} paymentInfo={paymentInfo} />
    </div>
  );
};

export default TicketPage;
