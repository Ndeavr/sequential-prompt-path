/**
 * BannerFirstCustomer48h — Mission 48H homepage banner targeting entrepreneurs.
 * Premium gradient, dismissible (session), tracks view + CTA clicks.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, X } from "lucide-react";
import { trackFirstCustomerEvent } from "@/utils/trackFirstCustomerEvent";
import { useFounderSpotsRemaining } from "@/hooks/useFounderSpotsRemaining";

const DISMISS_KEY = "fc48h_banner_dismissed";

export default function BannerFirstCustomer48h() {
  const navigate = useNavigate();
  // Lazy initializer reads sessionStorage synchronously on first render so the
  // banner never flashes for users who already dismissed it (was causing a
  // ~180px vertical jump on load).
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return sessionStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });
  const spots = useFounderSpotsRemaining("fondateur-149");

  useEffect(() => {
    if (dismissed) return;
    trackFirstCustomerEvent("founder_banner_view");
  }, [dismissed]);

  if (dismissed) return null;

  const handleClose = () => {
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setDismissed(true);
  };

  return (
    <div className="px-3 md:px-4 pt-3">
      <div
        className="relative rounded-3xl overflow-hidden border"
        style={{
          background:
            "linear-gradient(135deg, #0B1220 0%, #1A1F3A 45%, #3B2A1F 100%)",
          borderColor: "rgba(212,175,55,0.35)",
          boxShadow:
            "0 24px 48px -16px rgba(212,175,55,0.22), 0 8px 16px -4px rgba(0,0,0,0.25)",
        }}
      >
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(60% 80% at 80% 0%, rgba(245,200,90,0.18) 0%, transparent 60%)",
          }}
        />
        <button
          onClick={handleClose}
          aria-label="Fermer"
          className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/10"
          style={{ color: "rgba(255,255,255,0.7)" }}
        >
          <X size={16} />
        </button>

        <div className="relative z-[1] px-5 py-5 md:px-7 md:py-6 flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
          <div className="flex-1 min-w-0">
            <div
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-bold uppercase tracking-wider mb-2"
              style={{
                background: "rgba(245,200,90,0.16)",
                color: "#F5C85A",
                border: "1px solid rgba(245,200,90,0.35)",
              }}
            >
              <Sparkles size={11} /> Entrepreneurs du Québec
            </div>
            <h2
              className="text-[18px] md:text-[22px] font-extrabold leading-tight"
              style={{ color: "#FFFFFF", letterSpacing: "-0.02em" }}
            >
              Recevez des rendez-vous exclusifs.{" "}
              <span style={{ color: "#F5C85A" }}>Pas des leads partagés.</span>
            </h2>
            <p
              className="mt-1.5 text-[12.5px] md:text-[13.5px] leading-relaxed"
              style={{ color: "rgba(255,255,255,0.78)" }}
            >
              UNPRO analyse les besoins du propriétaire et recommande le
              professionnel le plus compatible.
            </p>
            {(() => {
              let label = "Places fondatrices disponibles";
              let color = "#F5C85A";
              if (spots !== null) {
                if (spots <= 0) {
                  label = "Places fondatrices complètes";
                  color = "#F87171";
                } else if (spots >= 25) {
                  label = "Places fondatrices disponibles";
                } else {
                  label = `${spots} places fondatrices restantes`;
                  if (spots <= 5) color = "#F87171";
                  else if (spots <= 10) color = "#F59E0B";
                }
              }
              return (
                <p className="mt-1 text-[11.5px] font-semibold" style={{ color }}>
                  {label}
                </p>
              );
            })()}
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col gap-2 md:min-w-[200px]">
            <button
              onClick={() => {
                trackFirstCustomerEvent("activation_started", { from: "banner" });
                navigate("/pro/activate");
              }}
              className="px-4 py-2.5 rounded-2xl font-bold text-[13px] transition-transform hover:-translate-y-0.5"
              style={{
                background:
                  "linear-gradient(135deg, #F5C85A 0%, #D4AF37 100%)",
                color: "#0B1220",
                boxShadow: "0 8px 20px -6px rgba(245,200,90,0.55)",
              }}
            >
              Activer mon profil
            </button>
            <button
              onClick={() => {
                trackFirstCustomerEvent("score_started", { from: "banner" });
                navigate("/pro/score");
              }}
              className="px-4 py-2.5 rounded-2xl font-semibold text-[13px] border transition-colors hover:bg-white/10"
              style={{
                borderColor: "rgba(255,255,255,0.35)",
                color: "#FFFFFF",
                background: "rgba(255,255,255,0.04)",
              }}
            >
              Voir mon score IA
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
