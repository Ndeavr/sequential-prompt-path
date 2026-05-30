/**
 * BottomDockGlass — iOS-inspired glass dock with central glowing Alex orb.
 * Replaces MobileBottomNav globally. Mobile-only (lg:hidden).
 */
import { Link, useLocation } from "react-router-dom";
import { Home, TrendingUp, User, Settings, Sparkles } from "lucide-react";
import { useAlexVoice } from "@/contexts/AlexVoiceContext";
import { useNavigationContext } from "@/hooks/useNavigationContext";
import "@/styles/unicorn-theme.css";

interface Item {
  label: string;
  to: string;
  icon: typeof Home;
}

export default function BottomDockGlass() {
  const { pathname } = useLocation();
  const { openAlex } = useAlexVoice();
  const { activeRole } = useNavigationContext();

  // Admin is a supervisor role — primary nav points to user surfaces so admins
  // can freely browse the app. /admin reachable via ProfileMenu.
  const growthPath =
    activeRole === "contractor" ? "/pro/dashboard"
    : "/dashboard";
  const profilePath =
    activeRole === "contractor" ? "/pro/account"
    : "/dashboard/account";
  const accountPath = profilePath;

  const LEFT: Item[] = [
    { label: "Accueil", to: "/", icon: Home },
    { label: "Croissance", to: growthPath, icon: TrendingUp },
  ];
  const RIGHT: Item[] = [
    { label: "Profil", to: profilePath, icon: User },
    { label: "Compte", to: accountPath, icon: Settings },
  ];


  const Tab = ({ item }: { item: Item }) => {
    const active = pathname === item.to || (item.to !== "/" && pathname.startsWith(item.to));
    const Icon = item.icon;
    return (
      <Link
        to={item.to}
        className="flex-1 flex flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium transition-colors"
        style={{ color: active ? "#2563FF" : "#667085" }}
      >
        <Icon size={20} strokeWidth={active ? 2.4 : 1.9} />
        <span>{item.label}</span>
      </Link>
    );
  };

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 pointer-events-none pb-[env(safe-area-inset-bottom)]">
      <div className="mx-3 mb-3 pointer-events-auto relative">
        <div
          className="flex items-end justify-between rounded-[28px] px-2 pt-1 pb-1 relative"
          style={{
            background: "rgba(255,255,255,0.78)",
            backdropFilter: "blur(24px) saturate(160%)",
            WebkitBackdropFilter: "blur(24px) saturate(160%)",
            border: "1px solid rgba(255,255,255,0.95)",
            boxShadow:
              "0 24px 60px -20px rgba(37,99,255,0.22), 0 8px 24px -14px rgba(11,18,32,0.10)",
          }}
        >
          {LEFT.map((it) => (
            <Tab key={it.to} item={it} />
          ))}
          {/* Spacer for center orb */}
          <div className="w-16 shrink-0" />
          {RIGHT.map((it) => (
            <Tab key={it.to} item={it} />
          ))}
        </div>

        {/* Center glowing Alex orb */}
        <button
          type="button"
          onClick={() => openAlex("home_dock")}
          className="absolute left-1/2 -translate-x-1/2 -top-5 w-14 h-14 rounded-full flex items-center justify-center text-white pointer-events-auto"
          style={{
            background:
              "radial-gradient(circle at 35% 30%, #BDE7FF 0%, #3B82F6 45%, #1E40AF 100%)",
            boxShadow:
              "0 12px 30px -6px rgba(37,99,255,0.65), 0 0 40px rgba(59,130,246,0.55), inset 0 -6px 16px rgba(11,18,60,0.4), inset 0 4px 10px rgba(255,255,255,0.5)",
            animation: "uc-breathe 4.2s ease-in-out infinite",
          }}
          aria-label="Alex"
        >
          <Sparkles size={22} strokeWidth={2.2} />
        </button>
        <div className="absolute left-1/2 -translate-x-1/2 top-[42px] text-[11px] font-semibold text-[#2563FF] pointer-events-none">
          Alex
        </div>
      </div>
    </div>
  );
}
