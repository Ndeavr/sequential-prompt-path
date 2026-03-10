import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  description?: string;
}

export const StatCard = ({ title, value, icon, description }: StatCardProps) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      {icon && <div className="text-muted-foreground">{icon}</div>}
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
    </CardContent>
  </Card>
);

export const EmptyState = ({ message, action }: { message: string; action?: ReactNode }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <p className="text-muted-foreground mb-4">{message}</p>
    {action}
  </div>
);

export const LoadingState = () => (
  <div className="flex items-center justify-center py-12">
    <p className="text-muted-foreground">Chargement…</p>
  </div>
);

export const ErrorState = ({ message }: { message?: string }) => (
  <div className="flex items-center justify-center py-12">
    <p className="text-destructive">{message || "Une erreur est survenue."}</p>
  </div>
);

export const PageHeader = ({ title, description, action }: { title: string; description?: string; action?: ReactNode }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
    <div>
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      {description && <p className="text-muted-foreground mt-1">{description}</p>}
    </div>
    {action}
  </div>
);
