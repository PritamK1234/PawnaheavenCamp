const API_BASE_URL = window.location.origin;

declare global {
  interface Window {
    Paytm?: {
      CheckoutJS: {
        init(config: any): Promise<void>;
        invoke(): Promise<any>;
        close(): void;
        onLoad(callback: () => void): void;
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
    if (window.Paytm?.CheckoutJS?.init) {
      resolve();
      return;
    }

    const existingScript = document.getElementById("paytm-checkout-js");
    if (existingScript) {
      existingScript.remove();
    }

    const script = document.createElement("script");
    script.id = "paytm-checkout-js";
    script.type = "application/javascript";
    script.crossOrigin = "anonymous";
    script.src = `https://securestage.paytmpayments.com/merchantpgpui/checkoutjs/merchants/${mid}.js`;
    script.onerror = () => reject(new Error("Failed to load Paytm SDK"));
    document.body.appendChild(script);

    const timeout = setTimeout(() => {
      reject(new Error("Paytm SDK load timed out"));
    }, 15000);

    const checkReady = setInterval(() => {
      if (window.Paytm?.CheckoutJS?.init) {
        clearInterval(checkReady);
        clearTimeout(timeout);
        resolve();
      }
    }, 200);
  });
}

async function verifyPayment(bookingId: string, txnResponse?: any): Promise<VerifyResponse> {
  const response = await fetch(`${API_BASE_URL}/api/payments/verify/${bookingId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ txnResponse: txnResponse || {} }),
  });
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

    return new Promise<VerifyResponse>((resolve, reject) => {
      let settled = false;

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
            if (settled) return;
            settled = true;
            console.log("Paytm txn response:", txnResponse);
            try {
              window.Paytm?.CheckoutJS.close();
            } catch (_e) {}

            try {
              const verifyResult = await verifyPayment(bookingId, txnResponse);
              resolve(verifyResult);
            } catch (_verifyErr) {
              reject(new Error("Payment completed but verification failed. Please check your booking status."));
            }
          },
          notifyMerchant: function (eventName: string, _data: any) {
            console.log("Paytm event:", eventName);
            if (eventName === "APP_CLOSED" && !settled) {
              settled = true;
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
          if (!settled) {
            settled = true;
            reject(new Error("Failed to open payment gateway"));
          }
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
