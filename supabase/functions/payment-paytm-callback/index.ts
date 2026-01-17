import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { PaytmChecksum } from "../_shared/paytmChecksum.ts";
import { WhatsAppService } from "../_shared/whatsappService.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function parseFormData(body: string): Record<string, string> {
  const params: Record<string, string> = {};
  const pairs = body.split("&");

  for (const pair of pairs) {
    const [key, value] = pair.split("=");
    if (key && value) {
      params[decodeURIComponent(key)] = decodeURIComponent(value.replace(/\+/g, " "));
    }
  }

  return params;
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

    const contentType = req.headers.get("content-type") || "";
    let paytmResponse: Record<string, string>;

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const body = await req.text();
      paytmResponse = parseFormData(body);
    } else if (contentType.includes("application/json")) {
      paytmResponse = await req.json();
    } else {
      return new Response(
        JSON.stringify({ error: "Unsupported content type" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Paytm callback received:", paytmResponse);

    const checksumHash = paytmResponse.CHECKSUMHASH;
    if (!checksumHash) {
      return new Response(
        JSON.stringify({ error: "Checksum not found in response" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const merchantKey = Deno.env.get("PAYTM_MERCHANT_KEY") ?? "";
    const isValidChecksum = await PaytmChecksum.verifyChecksumByObject(
      paytmResponse,
      merchantKey,
      checksumHash
    );

    if (!isValidChecksum) {
      console.error("Invalid checksum received from Paytm");
      return new Response(
        JSON.stringify({ error: "Invalid checksum" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const orderId = paytmResponse.ORDERID;
    const txnId = paytmResponse.TXNID || "";
    const txnAmount = paytmResponse.TXNAMOUNT || "";
    const status = paytmResponse.STATUS || "";
    const respCode = paytmResponse.RESPCODE || "";
    const respMsg = paytmResponse.RESPMSG || "";

    const { data: booking, error: fetchError } = await supabaseClient
      .from("bookings")
      .select("*")
      .eq("order_id", orderId)
      .maybeSingle();

    if (fetchError || !booking) {
      console.error("Booking not found for order_id:", orderId);
      return new Response(
        JSON.stringify({ error: "Booking not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const updateData: any = {
      transaction_id: txnId,
    };

    if (status === "TXN_SUCCESS") {
      updateData.payment_status = "SUCCESS";
      updateData.booking_status = "PAYMENT_SUCCESS";
    } else if (status === "TXN_FAILURE") {
      updateData.payment_status = "FAILED";
    } else if (status === "PENDING") {
      updateData.payment_status = "PENDING";
    } else {
      updateData.payment_status = "FAILED";
    }

    const { data: updatedBooking, error: updateError } = await supabaseClient
      .from("bookings")
      .update(updateData)
      .eq("booking_id", booking.booking_id)
      .select()
      .single();

    if (updateError) {
      console.error("Failed to update booking:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update booking", details: updateError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Booking updated successfully:", {
      booking_id: booking.booking_id,
      order_id: orderId,
      payment_status: updateData.payment_status,
      booking_status: updateData.booking_status || booking.booking_status,
    });

    if (status === "TXN_SUCCESS") {
      const whatsapp = new WhatsAppService();

      await whatsapp.sendTextMessage(
        booking.guest_phone,
        `Payment successful ✅\n\nWe are processing your booking.\nYou will receive your e-ticket after owner confirmation.`
      );

      const checkinDate = new Date(booking.checkin_datetime).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      });
      const checkoutDate = new Date(booking.checkout_datetime).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      });

      const dueAmount = (booking.total_amount || 0) - booking.advance_amount;

      const ownerMessage = `🔔 New Booking Request\n\nProperty: ${booking.property_name}\nGuest: ${booking.guest_name}\nCheck-in: ${checkinDate}\nCheck-out: ${checkoutDate}\nPersons: ${booking.persons || 0}\nAdvance Paid: ₹${booking.advance_amount}\nDue Amount: ₹${dueAmount}\n\nPlease confirm or cancel:`;

      await whatsapp.sendInteractiveButtons(
        booking.owner_phone,
        ownerMessage,
        [
          {
            id: JSON.stringify({ bookingId: booking.booking_id, action: "CONFIRM" }),
            title: "✅ Confirm",
          },
          {
            id: JSON.stringify({ bookingId: booking.booking_id, action: "CANCEL" }),
            title: "❌ Cancel",
          },
        ]
      );

      await whatsapp.sendTextMessage(
        booking.admin_phone,
        `📋 New Booking Alert\n\nProperty: ${booking.property_name}\nOwner: ${booking.owner_phone}\nGuest: ${booking.guest_name} (${booking.guest_phone})\nAdvance: ₹${booking.advance_amount}\nDue: ₹${dueAmount}\nStatus: Waiting for owner confirmation`
      );

      await supabaseClient
        .from("bookings")
        .update({ booking_status: "BOOKING_REQUEST_SENT_TO_OWNER" })
        .eq("booking_id", booking.booking_id);

      console.log("WhatsApp notifications sent for booking:", booking.booking_id);
    }

    const frontendUrl = Deno.env.get("FRONTEND_URL") || "http://localhost:5173";
    const redirectUrl = status === "TXN_SUCCESS"
      ? `${frontendUrl}/ticket?booking_id=${booking.booking_id}`
      : `${frontendUrl}`;

    return new Response(
      `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payment ${status === "TXN_SUCCESS" ? "Success" : "Failed"}</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          .container {
            background: white;
            padding: 2rem;
            border-radius: 10px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            text-align: center;
            max-width: 500px;
          }
          .success { color: #10b981; }
          .failed { color: #ef4444; }
          .icon { font-size: 4rem; margin-bottom: 1rem; }
          h1 { margin: 0 0 1rem 0; }
          p { color: #666; margin: 0.5rem 0; }
          .details {
            background: #f9fafb;
            padding: 1rem;
            border-radius: 5px;
            margin: 1rem 0;
            text-align: left;
          }
          .details p { margin: 0.5rem 0; font-size: 0.9rem; }
          .btn {
            display: inline-block;
            margin-top: 1.5rem;
            padding: 0.75rem 2rem;
            background: #667eea;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            transition: background 0.3s;
          }
          .btn:hover { background: #5568d3; }
        </style>
      </head>
      <body>
        <div class="container">
          ${status === "TXN_SUCCESS" ? `
            <div class="icon success">✓</div>
            <h1 class="success">Payment Successful!</h1>
            <p>Your booking has been confirmed.</p>
          ` : `
            <div class="icon failed">✗</div>
            <h1 class="failed">Payment Failed</h1>
            <p>${respMsg}</p>
          `}
          <div class="details">
            <p><strong>Booking ID:</strong> ${booking.booking_id}</p>
            <p><strong>Order ID:</strong> ${orderId}</p>
            ${txnId ? `<p><strong>Transaction ID:</strong> ${txnId}</p>` : ""}
            <p><strong>Amount:</strong> ₹${txnAmount}</p>
            <p><strong>Status:</strong> ${status}</p>
          </div>
          <a href="${redirectUrl}" class="btn">Continue</a>
        </div>
      </body>
      </html>
      `,
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "text/html" },
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
