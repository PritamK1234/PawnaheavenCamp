const API_BASE_URL = window.location.origin;

declare global {
  interface Window {
    Paytm?: {
      CheckoutJS: {
        init(config: any): Promise<void>;
        invoke(): Promise<any>;
        close(): void;
      };
    };
  }
}

interface InitiateResponse {
  success: boolean;
  txnToken: string;
  order_id: string;
  booking_id: string;
  amount: string;
  mid: string;
}

interface VerifyResponse {
  success: boolean;
  payment_status: string;
  booking_status: string;
  booking_id: string;
  message?: string;
}

function loadPaytmScript(mid: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existingScript = document.getElementById("paytm-checkout-js");
    if (existingScript) {
      if (window.Paytm?.CheckoutJS) {
        resolve();
      } else {
        existingScript.addEventListener("load", () => resolve());
        existingScript.addEventListener("error", () =>
          reject(new Error("Failed to load Paytm SDK"))
        );
      }
      return;
    }

    const script = document.createElement("script");
    script.id = "paytm-checkout-js";
    script.type = "application/javascript";
    script.crossOrigin = "anonymous";
    script.src = `https://securestage.paytmpayments.com/merchantpgpui/checkoutjs/merchants/${mid}.js`;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Paytm SDK"));
    document.head.appendChild(script);
  });
}

async function verifyPayment(bookingId: string): Promise<VerifyResponse> {
  const response = await fetch(`${API_BASE_URL}/api/payments/verify/${bookingId}`);
  if (!response.ok) {
    throw new Error("Payment verification failed");
  }
  return response.json();
}

export class PaytmPaymentService {
  static async openCheckout(bookingId: string): Promise<VerifyResponse> {
    const initiateRes = await fetch(`${API_BASE_URL}/api/payments/paytm/initiate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ booking_id: bookingId }),
    });

    if (!initiateRes.ok) {
      const err = await initiateRes.json();
      throw new Error(err.error || "Failed to initiate payment");
    }

    const data: InitiateResponse = await initiateRes.json();

    await loadPaytmScript(data.mid);

    if (!window.Paytm?.CheckoutJS) {
      throw new Error("Paytm SDK failed to initialize");
    }

    return new Promise<VerifyResponse>((resolve, reject) => {
      const config = {
        root: "",
        flow: "DEFAULT",
        data: {
          orderId: data.order_id,
          token: data.txnToken,
          tokenType: "TXN_TOKEN",
          amount: data.amount,
        },
        merchant: {
          mid: data.mid,
          redirect: false,
        },
        handler: {
          transactionStatus: async function (txnResponse: any) {
            console.log("Paytm txn response:", txnResponse);
            try {
              window.Paytm?.CheckoutJS.close();
            } catch (_e) {}

            try {
              const verifyResult = await verifyPayment(bookingId);
              resolve(verifyResult);
            } catch (verifyErr) {
              reject(new Error("Payment completed but verification failed. Please check your booking status."));
            }
          },
          notifyMerchant: function (eventName: string, data: any) {
            console.log("Paytm event:", eventName, data);
            if (eventName === "APP_CLOSED") {
              reject(new Error("Payment cancelled by user"));
            }
          },
        },
      };

      window.Paytm!.CheckoutJS.init(config)
        .then(() => {
          window.Paytm!.CheckoutJS.invoke();
        })
        .catch((initErr: any) => {
          console.error("Paytm init error:", initErr);
          reject(new Error("Failed to open payment gateway"));
        });
    });
  }

  static getRedirectUrl(bookingId: string): string {
    return `${API_BASE_URL}/api/payments/paytm/redirect/${bookingId}`;
  }

  static redirectToPaytm(bookingId: string): void {
    window.location.href = this.getRedirectUrl(bookingId);
  }

  static async initiateAndRedirect(
    bookingId: string,
    _channelId: "WEB" | "WAP" = "WEB"
  ): Promise<void> {
    this.redirectToPaytm(bookingId);
  }
}
