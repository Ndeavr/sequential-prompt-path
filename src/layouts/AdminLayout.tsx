import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Users, Briefcase, FileText, Star, FolderOpen, CalendarDays, TrendingUp, LogOut, MapPin, BarChart3 } from "lucide-react";
import type { ReactNode } from "react";

const navItems = [
  { to: "/admin", label: "Tableau de bord", icon: LayoutDashboard },
  { to: "/admin/users", label: "Utilisateurs", icon: Users },
  { to: "/admin/contractors", label: "Entrepreneurs", icon: Briefcase },
  { to: "/admin/territories", label: "Territoires", icon: MapPin },
  { to: "/admin/leads", label: "Leads", icon: TrendingUp },
  { to: "/admin/appointments", label: "Rendez-vous", icon: CalendarDays },
  { to: "/admin/quotes", label: "Soumissions", icon: FileText },
  { to: "/admin/reviews", label: "Avis", icon: Star },
  { to: "/admin/documents", label: "Documents", icon: FolderOpen },
  { to: "/admin/growth", label: "Croissance", icon: BarChart3 },
];

const AdminLayout = ({ children }: { children: ReactNode }) => {
  const { pathname } = useLocation();
  const { signOut, user } = useAuth();

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="hidden md:flex w-64 flex-col bg-card border-r border-border p-5">
        <Link to="/" className="text-xl font-bold text-gradient mb-1 px-2">UNPRO</Link>
        <span className="text-meta text-muted-foreground px-2 mb-8">Administration</span>
        <nav className="flex-1 space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                pathname === to ? "bg-primary text-primary-foreground shadow-soft" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-border pt-4 mt-4">
          <p className="text-meta text-muted-foreground px-2 mb-2 truncate">{user?.email}</p>
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2" onClick={signOut}>
            <LogOut className="h-4 w-4" /> Déconnexion
          </Button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col">
        <header className="md:hidden flex items-center justify-between border-b border-border px-4 py-3 bg-card">
          <Link to="/" className="text-lg font-bold text-gradient">UNPRO Admin</Link>
          <Button variant="ghost" size="icon" onClick={signOut}><LogOut className="h-4 w-4" /></Button>
        </header>
        <main className="flex-1 p-4 md:p-8 overflow-auto">{children}</main>
      </div>
    </div>
  );
};

export default AdminLayout;
