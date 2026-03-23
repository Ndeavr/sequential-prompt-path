/**
 * UNPRO — Condo Quick Actions by role
 */
import { Link } from "react-router-dom";
import { useCondoRole } from "@/hooks/useCondoRole";
import { Plus, Wrench, FileText, Vote, DollarSign, AlertTriangle, Users, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

const ownerActions = [
  { to: "/condos/requests/new", label: "Créer une demande", icon: Plus },
  { to: "/condos/documents", label: "Mes documents", icon: FileText },
  { to: "/condos/incidents/new", label: "Signaler un problème", icon: AlertTriangle },
];

const managerActions = [
  { to: "/condos/requests", label: "Demandes ouvertes", icon: Wrench },
  { to: "/condos/contractors", label: "Entrepreneurs", icon: Users },
  { to: "/condos/calendar", label: "Calendrier", icon: Calendar },
  { to: "/condos/maintenance", label: "Entretien", icon: Wrench },
];

const boardActions = [
  { to: "/condos/voting", label: "Votes & décisions", icon: Vote },
  { to: "/condos/financials", label: "Budget", icon: DollarSign },
  { to: "/condos/requests", label: "Demandes", icon: Wrench },
  { to: "/condos/reports", label: "Rapports", icon: FileText },
];

export default function CondoQuickActions() {
  const { condoRole } = useCondoRole();
  
  const actions = condoRole === "condo_board" ? boardActions
    : condoRole === "condo_manager" ? managerActions
    : ownerActions;

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((a) => (
        <Button key={a.to} variant="outline" size="sm" asChild className="rounded-xl gap-2">
          <Link to={a.to}>
            <a.icon className="h-4 w-4" />
            {a.label}
          </Link>
        </Button>
      ))}
    </div>
  );
}
