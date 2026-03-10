import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Home, FileText, BarChart3, User, CalendarDays, LogOut } from "lucide-react";
import type { ReactNode } from "react";

const navItems = [
  { to: "/dashboard", label: "Tableau de bord", icon: Home },
  { to: "/dashboard/properties", label: "Propriétés", icon: Home },
  { to: "/dashboard/quotes", label: "Soumissions", icon: FileText },
  { to: "/dashboard/appointments", label: "Rendez-vous", icon: CalendarDays },
  { to: "/dashboard/home-score", label: "Score maison", icon: BarChart3 },
  { to: "/dashboard/account", label: "Mon compte", icon: User },
];

const DashboardLayout = ({ children }: { children: ReactNode }) => {
  const { pathname } = useLocation();
  const { signOut, user } = useAuth();

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-card p-4">
        <Link to="/" className="text-xl font-bold text-foreground mb-8 px-2">UNPRO</Link>
        <nav className="flex-1 space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                pathname === to
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
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
      {/* Mobile header */}
      <div className="flex-1 flex flex-col">
        <header className="md:hidden flex items-center justify-between border-b border-border px-4 py-3 bg-card">
          <Link to="/" className="text-lg font-bold text-foreground">UNPRO</Link>
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

export default DashboardLayout;
