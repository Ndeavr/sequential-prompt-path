import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, User, Star, FileText, Shield, CalendarDays, TrendingUp, LogOut, CreditCard } from "lucide-react";
import type { ReactNode } from "react";

const navItems = [
  { to: "/pro", label: "Tableau de bord", icon: LayoutDashboard },
  { to: "/pro/profile", label: "Mon profil", icon: User },
  { to: "/pro/leads", label: "Leads", icon: TrendingUp },
  { to: "/pro/appointments", label: "Rendez-vous", icon: CalendarDays },
  { to: "/pro/aipp-score", label: "Score AIPP", icon: Star },
  { to: "/pro/reviews", label: "Avis clients", icon: Star },
  { to: "/pro/documents", label: "Documents", icon: FileText },
  { to: "/pro/account", label: "Mon compte", icon: Shield },
];

const ContractorLayout = ({ children }: { children: ReactNode }) => {
  const { pathname } = useLocation();
  const { signOut, user } = useAuth();

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-card p-4">
        <Link to="/" className="text-xl font-bold text-foreground mb-1 px-2">UNPRO</Link>
        <span className="text-xs text-muted-foreground px-2 mb-8">Espace Pro</span>
        <nav className="flex-1 space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                pathname === to ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-border pt-4 mt-4">
          <p className="text-xs text-muted-foreground px-2 mb-2 truncate">{user?.email}</p>
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2" onClick={signOut}>
            <LogOut className="h-4 w-4" /> Déconnexion
          </Button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col">
        <header className="md:hidden flex items-center justify-between border-b border-border px-4 py-3 bg-card">
          <Link to="/" className="text-lg font-bold text-foreground">UNPRO Pro</Link>
          <div className="flex items-center gap-2">
            {navItems.slice(0, 4).map(({ to, icon: Icon }) => (
              <Link key={to} to={to} className={`p-2 rounded-md ${pathname === to ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                <Icon className="h-4 w-4" />
              </Link>
            ))}
            <Button variant="ghost" size="icon" onClick={signOut}><LogOut className="h-4 w-4" /></Button>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
};

export default ContractorLayout;
