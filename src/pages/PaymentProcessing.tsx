import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export default function PaymentProcessing() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [error, setError] = useState(false);

  const bookingId: string | undefined = state?.bookingId;
  const returnPath: string = state?.returnPath || "/";

  useEffect(() => {
    if (!bookingId) {
      navigate("/", { replace: true });
      return;
    }

    async function initPayment() {
      try {
        const res = await fetch("/api/payments/paytm/initiate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ booking_id: bookingId }),
        });

        if (!res.ok) {
          throw new Error("Payment initiation failed");
        }

        const data = await res.json();

        if (!data.redirect_url) {
          throw new Error("No redirect URL received from payment gateway");
        }

        window.location.href = data.redirect_url;
      } catch {
        setError(true);
      }
    }

    initPayment();
  }, [bookingId, navigate]);

  return (
    <div className="fixed inset-0 bg-[#0a0a0a] flex flex-col items-center justify-center z-50 px-6">
      {!error ? (
        <div className="flex flex-col items-center gap-8 text-center">
          <div className="flex flex-col items-center gap-2">
            <span
              className="text-3xl font-bold tracking-wider"
              style={{ fontFamily: "Georgia, serif", color: "#D4AF37" }}
            >
              PawnaHavenCamp
            </span>
            <span className="text-xs tracking-[0.3em] uppercase text-gray-500">
              Luxury Stays · Pawna Lake
            </span>
          </div>

          <div
            className="w-16 h-16 rounded-full border-4 border-[#D4AF37]/20 border-t-[#D4AF37]"
            style={{ animation: "spin 1s linear infinite" }}
          />

          <div className="flex flex-col items-center gap-2">
            <p className="text-white text-lg font-medium">
              Connecting to secure payment gateway...
            </p>
            <p className="text-gray-500 text-sm">
              Please do not close or refresh this page
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-6 text-center max-w-sm">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
            <span className="text-red-400 text-3xl">✕</span>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-white text-lg font-semibold">
              Payment initialization failed
            </p>
            <p className="text-gray-400 text-sm">
              Could not connect to the payment gateway. Please try again.
            </p>
          </div>
          <button
            onClick={() => navigate(returnPath)}
            className="px-6 py-3 rounded-xl font-bold text-black text-sm"
            style={{ background: "#D4AF37" }}
          >
            Go Back & Try Again
          </button>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
