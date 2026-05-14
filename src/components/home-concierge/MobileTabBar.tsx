/**
 * MobileTabBar — Visual-only sticky bottom nav for the warm hero (mobile).
 */
import { Home, Briefcase, User } from "lucide-react";

const tabs = [
  { icon: Home, label: "Accueil", href: "/", active: true },
  { icon: Briefcase, label: "Projets", href: "/dashboard", active: false },
  { icon: User, label: "Profil", href: "/profil", active: false },
];

export default function MobileTabBar() {
  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-[#0F1B2D]/10 bg-[#F7F6F0]/95 backdrop-blur-md"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Navigation principale"
    >
      <ul className="flex items-stretch justify-around px-2">
        {tabs.map(({ icon: Icon, label, href, active }) => (
          <li key={label} className="flex-1">
            <a
              href={href}
              className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition ${
                active ? "text-[#0E5E4E]" : "text-[#0F1B2D]/55 hover:text-[#0F1B2D]"
              }`}
            >
              <Icon className="w-5 h-5" strokeWidth={active ? 2.4 : 1.8} />
              <span>{label}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
