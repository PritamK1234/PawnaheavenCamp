import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { PaytmChecksum } from "../_shared/paytmChecksum.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PaymentInitiateRequest {
  booking_id: string;
  channel_id?: "WEB" | "WAP";
}

function generatePaytmOrderId(): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `PAYTM_${timestamp}_${random}`;
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

    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const requestData: PaymentInitiateRequest = await req.json();

    if (!requestData.booking_id) {
      return new Response(
        JSON.stringify({ error: "Booking ID is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: booking, error: fetchError } = await supabaseClient
      .from("bookings")
      .select("*")
      .eq("booking_id", requestData.booking_id)
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

    if (!booking) {
      return new Response(
        JSON.stringify({ error: "Booking not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (booking.payment_status === "SUCCESS") {
      return new Response(
        JSON.stringify({ error: "Payment already completed for this booking" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const paytmOrderId = generatePaytmOrderId();
    const channelId = requestData.channel_id || Deno.env.get("PAYTM_CHANNEL_ID") || "WEB";

    const mid = Deno.env.get("PAYTM_MID") || "SpwYpD36833569776448";
    const website = Deno.env.get("PAYTM_WEBSITE") || "WEBSTAGING";
    const industryType = Deno.env.get("PAYTM_INDUSTRY_TYPE") || "Retail";
    const merchantKey = Deno.env.get("PAYTM_MERCHANT_KEY") || "j@D7fI3pAMAl7nQC";
    const callbackUrl = Deno.env.get("PAYTM_CALLBACK_URL") || "https://rgcnuvfbntpgcurstnpb.supabase.co/functions/v1/payment-paytm-callback";
    const gatewayUrl = Deno.env.get("PAYTM_GATEWAY_URL") || "https://securegw-stage.paytm.in/order/process";

    if (!mid || !website || !industryType || !merchantKey) {
      console.error("Missing Paytm configuration");
      return new Response(
        JSON.stringify({ error: "Payment gateway not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const paytmParams: Record<string, string> = {
      MID: mid,
      WEBSITE: website,
      INDUSTRY_TYPE_ID: industryType,
      CHANNEL_ID: channelId,
      ORDER_ID: paytmOrderId,
      CUST_ID: booking.guest_phone,
      MOBILE_NO: booking.guest_phone,
      EMAIL: `${booking.guest_phone}@guest.com`,
      TXN_AMOUNT: booking.advance_amount.toString(),
      CALLBACK_URL: callbackUrl,
    };

    const checksum = await PaytmChecksum.generateChecksum(paytmParams, merchantKey);

    const { error: updateError } = await supabaseClient
      .from("bookings")
      .update({ order_id: paytmOrderId })
      .eq("booking_id", requestData.booking_id);

    if (updateError) {
      console.error("Failed to update order_id:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to save order ID", details: updateError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const response = {
      success: true,
      paytm_params: {
        ...paytmParams,
        CHECKSUMHASH: checksum,
      },
      gateway_url: gatewayUrl,
      order_id: paytmOrderId,
      booking_id: requestData.booking_id,
      amount: booking.advance_amount,
    };

    return new Response(
      JSON.stringify(response),
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
