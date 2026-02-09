const API_BASE_URL = window.location.origin;

interface BookingInitiateResponse {
  booking: {
    booking_id: string;
  };
}

export class PaytmPaymentService {
  static getRedirectUrl(bookingId: string): string {
    return `${API_BASE_URL}/api/payments/paytm/redirect/${bookingId}`;
  }

  static redirectToPaytm(bookingId: string): void {
    const redirectUrl = this.getRedirectUrl(bookingId);
    console.log("Redirecting to Paytm payment via:", redirectUrl);
    window.open(redirectUrl, "_blank");
  }

  static async initiateAndRedirect(
    bookingId: string,
    _channelId: "WEB" | "WAP" = "WEB"
  ): Promise<void> {
    this.redirectToPaytm(bookingId);
  }
}
