import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

type BookingStatus =
  | "PAYMENT_PENDING"
  | "PAYMENT_SUCCESS"
  | "BOOKING_REQUEST_SENT_TO_OWNER"
  | "OWNER_CONFIRMED"
  | "OWNER_CANCELLED"
  | "TICKET_GENERATED"
  | "REFUND_REQUIRED";

type PaymentStatus = "INITIATED" | "SUCCESS" | "FAILED" | "PENDING";

interface StatusUpdateRequest {
  booking_id: string;
  booking_status?: BookingStatus;
  payment_status?: PaymentStatus;
  order_id?: string;
  transaction_id?: string;
}

const VALID_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  "PAYMENT_PENDING": ["PAYMENT_SUCCESS"],
  "PAYMENT_SUCCESS": ["BOOKING_REQUEST_SENT_TO_OWNER"],
  "BOOKING_REQUEST_SENT_TO_OWNER": ["OWNER_CONFIRMED", "OWNER_CANCELLED"],
  "OWNER_CONFIRMED": ["TICKET_GENERATED"],
  "OWNER_CANCELLED": ["REFUND_REQUIRED"],
  "TICKET_GENERATED": [],
  "REFUND_REQUIRED": [],
};

function isValidTransition(currentStatus: BookingStatus, newStatus: BookingStatus): boolean {
  const allowedTransitions = VALID_TRANSITIONS[currentStatus];
  return allowedTransitions.includes(newStatus);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    if (req.method !== "PUT" && req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const updateRequest: StatusUpdateRequest = await req.json();

    if (!updateRequest.booking_id) {
      return new Response(
        JSON.stringify({ error: "Booking ID is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: currentBooking, error: fetchError } = await supabaseClient
      .from("bookings")
      .select("booking_status, payment_status")
      .eq("booking_id", updateRequest.booking_id)
      .maybeSingle();

    if (fetchError) {
      console.error("Database error:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch booking", details: fetchError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!currentBooking) {
      return new Response(
        JSON.stringify({ error: "Booking not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (updateRequest.booking_status) {
      const currentStatus = currentBooking.booking_status as BookingStatus;
      const newStatus = updateRequest.booking_status;

      if (currentStatus === newStatus) {
        return new Response(
          JSON.stringify({
            success: true,
            message: "Booking already in requested status",
            booking_status: currentStatus
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (!isValidTransition(currentStatus, newStatus)) {
        return new Response(
          JSON.stringify({
            error: "Invalid state transition",
            current_status: currentStatus,
            requested_status: newStatus,
            allowed_transitions: VALID_TRANSITIONS[currentStatus]
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    const updateData: any = {};

    if (updateRequest.booking_status) {
      updateData.booking_status = updateRequest.booking_status;
    }

    if (updateRequest.payment_status) {
      updateData.payment_status = updateRequest.payment_status;
    }

    if (updateRequest.order_id) {
      updateData.order_id = updateRequest.order_id;
    }

    if (updateRequest.transaction_id) {
      updateData.transaction_id = updateRequest.transaction_id;
    }

    if (Object.keys(updateData).length === 0) {
      return new Response(
        JSON.stringify({ error: "No fields to update" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data, error } = await supabaseClient
      .from("bookings")
      .update(updateData)
      .eq("booking_id", updateRequest.booking_id)
      .select()
      .single();

    if (error) {
      console.error("Database error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to update booking", details: error.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        booking: data,
        message: "Booking status updated successfully"
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
