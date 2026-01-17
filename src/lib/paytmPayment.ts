const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

interface PaytmInitiateResponse {
  success: boolean;
  paytm_params: Record<string, string>;
  gateway_url: string;
  order_id: string;
  booking_id: string;
  amount: number;
}

export class PaytmPaymentService {
  static async initiatePayment(
    bookingId: string,
    channelId: "WEB" | "WAP" = "WEB"
  ): Promise<PaytmInitiateResponse> {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/payment-paytm-initiate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          booking_id: bookingId,
          channel_id: channelId,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to initiate payment");
    }

    return await response.json();
  }

  static redirectToPaytm(paytmParams: Record<string, string>, gatewayUrl: string): void {
    const form = document.createElement("form");
    form.method = "POST";
    form.action = gatewayUrl;
    form.style.display = "none";

    Object.keys(paytmParams).forEach((key) => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = key;
      input.value = paytmParams[key];
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
  }

  static async initiateAndRedirect(
    bookingId: string,
    channelId: "WEB" | "WAP" = "WEB"
  ): Promise<void> {
    try {
      const response = await this.initiatePayment(bookingId, channelId);
      this.redirectToPaytm(response.paytm_params, response.gateway_url);
    } catch (error) {
      console.error("Payment initiation failed:", error);
      throw error;
    }
  }
}
