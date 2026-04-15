/**
 * BottomNavAlexPrimary — Premium floating bottom navigation dock.
 * Glass effect, Alex highlighted center, safe area aware.
 */
import { motion } from "framer-motion";
import { BarChart3, Bell, Bot, Settings, User } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

const NAV_ITEMS = [
  { key: "kpis", icon: BarChart3, label: "KPIs", path: "/dashboard" },
  { key: "alerts", icon: Bell, label: "Alertes", path: "/notifications" },
  { key: "alex", icon: Bot, label: "Alex", path: "/alex", isCenter: true },
  { key: "admin", icon: Settings, label: "Admin", path: "/admin" },
  { key: "account", icon: User, label: "Compte", path: "/compte" },
];

export default function BottomNavAlexPrimary() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pb-[env(safe-area-inset-bottom)]">
      <div
        className="mx-3 mb-2 rounded-2xl border border-border/20 px-2 py-1.5 flex items-center justify-around"
        style={{
          background: "linear-gradient(180deg, hsl(var(--card) / 0.85), hsl(var(--card) / 0.95))",
          backdropFilter: "blur(20px) saturate(1.5)",
          boxShadow: "0 -4px 30px hsl(var(--primary) / 0.05), 0 0 1px hsl(var(--border) / 0.3)",
        }}
      >
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          const Icon = item.icon;

          if (item.isCenter) {
            return (
              <button
                key={item.key}
                onClick={() => navigate(item.path)}
                className="relative -mt-5"
              >
                <motion.div
                  whileTap={{ scale: 0.92 }}
                  className="w-14 h-14 rounded-full flex items-center justify-center border border-primary/40"
                  style={{
                    background: "linear-gradient(135deg, hsl(var(--primary)), hsl(262 80% 50%))",
                    boxShadow: "0 4px 20px hsl(var(--primary) / 0.35), 0 0 40px hsl(262 80% 50% / 0.15)",
                  }}
                >
                  <Icon className="w-6 h-6 text-primary-foreground" />
                </motion.div>
                <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[10px] font-medium text-primary">
                  {item.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={item.key}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center gap-0.5 py-1.5 px-2 rounded-xl transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
