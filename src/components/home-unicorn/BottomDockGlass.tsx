/**
 * BottomDockGlass — iOS-inspired glass dock with central glowing Alex orb.
 * Mobile-only (lg:hidden). 4 tabs (2 left + 2 right) + centered Alex orb.
 * Menus are role-aware: homeowner, contractor, admin.
 */
import { Link, useLocation } from "react-router-dom";
import {
  Home,
  TrendingUp,
  User,
  Sparkles,
  Wrench,
  FolderKanban,
  Inbox,
  CalendarDays,
  Activity,
  Settings2,
  type LucideIcon,
} from "lucide-react";
import { useAlexVoice } from "@/contexts/AlexVoiceContext";
import { useNavigationContext } from "@/hooks/useNavigationContext";
import "@/styles/unicorn-theme.css";

interface Item {
  label: string;
  to: string;
  icon: LucideIcon;
}

type RoleMenu = { left: [Item, Item]; right: [Item, Item] };

function getMenu(role: string | undefined): RoleMenu {
  if (role === "contractor") {
    return {
      left: [
        { label: "Tableau", to: "/pro", icon: Home },
        { label: "Leads", to: "/pro/leads", icon: Inbox },
      ],
      right: [
        { label: "Agenda", to: "/pro/appointments", icon: CalendarDays },
        { label: "Profil", to: "/pro/account", icon: User },
      ],
    };
  }
  if (role === "admin") {
    return {
      left: [
        { label: "Ops", to: "/admin/operations", icon: Activity },
        { label: "Croissance", to: "/admin/growth", icon: TrendingUp },
      ],
      right: [
        { label: "Système", to: "/admin", icon: Settings2 },
        { label: "Profil", to: "/dashboard/account", icon: User },
      ],
    };
  }
  // homeowner (default)
  return {
    left: [
      { label: "Accueil", to: "/", icon: Home },
      { label: "Maison", to: "/dashboard", icon: Wrench },
    ],
    right: [
      { label: "Projets", to: "/dashboard/projects", icon: FolderKanban },
      { label: "Profil", to: "/dashboard/account", icon: User },
    ],
  };
}

export default function BottomDockGlass() {
  const { pathname } = useLocation();
  const { openAlex } = useAlexVoice();
  const { activeRole } = useNavigationContext();

  const { left, right } = getMenu(activeRole);

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
    <div
      data-bottom-dock="glass"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 pointer-events-none pb-[env(safe-area-inset-bottom)]"
    >
      <div className="mx-3 mb-3 pointer-events-auto relative">
        <div
          className="grid grid-cols-5 items-end rounded-[28px] px-0 pt-1 pb-1 relative"
          style={{
            background: "rgba(255,255,255,0.78)",
            backdropFilter: "blur(24px) saturate(160%)",
            WebkitBackdropFilter: "blur(24px) saturate(160%)",
            border: "1px solid rgba(255,255,255,0.95)",
            boxShadow:
              "0 24px 60px -20px rgba(37,99,255,0.22), 0 8px 24px -14px rgba(11,18,32,0.10)",
          }}
        >
          <Tab item={left[0]} />
          <Tab item={left[1]} />
          {/* Center Alex slot — orb is absolutely anchored to this cell */}
          <div className="relative flex flex-col items-center justify-center">
            <button
              type="button"
              onClick={() => openAlex("home_dock")}
              aria-label="Parler à Alex"
              className="w-11 h-11 rounded-full flex items-center justify-center text-white pointer-events-auto transition-transform duration-200 ease-out active:scale-[0.92] hover:scale-105 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#3B82F6]/40"
              style={{
                background:
                  "radial-gradient(circle at 35% 30%, #BDE7FF 0%, #3B82F6 45%, #1E40AF 100%)",
                boxShadow:
                  "0 10px 24px -6px rgba(37,99,255,0.55), 0 0 28px rgba(59,130,246,0.45), inset 0 -5px 12px rgba(11,18,60,0.4), inset 0 3px 8px rgba(255,255,255,0.5)",
                animation: "uc-breathe 4.2s ease-in-out infinite",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <Sparkles size={18} strokeWidth={2.2} />
            </button>
            <span className="text-[11px] font-semibold text-[#2563FF] mt-0.5">Alex</span>
          </div>

          <Tab item={right[0]} />
          <Tab item={right[1]} />
        </div>
      </div>
    </div>
  );
}
