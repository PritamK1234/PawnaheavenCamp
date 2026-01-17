const API_BASE_URL = '';

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
      `${API_BASE_URL}/api/payments/paytm/initiate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
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
    if (!gatewayUrl) {
      throw new Error("Gateway URL is not configured");
    }

    const form = document.createElement("form");
    form.method = "POST";
    form.action = gatewayUrl;
    form.enctype = "application/x-www-form-urlencoded";
    form.style.display = "none";

    Object.keys(paytmParams).forEach((key) => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = key;
      input.value = paytmParams[key];
      form.appendChild(input);
    });

    document.body.appendChild(form);
    console.log("Submitting payment form to:", gatewayUrl);
    console.log("Paytm Parameters:", Object.keys(paytmParams));

    try {
      form.submit();
      setTimeout(() => {
        document.body.removeChild(form);
      }, 1000);
    } catch (error) {
      console.error("Form submission error:", error);
      if (form.parentNode) {
        document.body.removeChild(form);
      }
      throw new Error("Failed to redirect to payment gateway");
    }
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
