import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  description?: string;
}

export const StatCard = ({ title, value, icon, description }: StatCardProps) => (
  <Card className="relative overflow-hidden">
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-meta font-medium text-muted-foreground">{title}</CardTitle>
      {icon && <div className="text-primary/60">{icon}</div>}
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {description && <p className="text-meta text-muted-foreground mt-1">{description}</p>}
    </CardContent>
  </Card>
);

export const EmptyState = ({ message, action }: { message: string; action?: ReactNode }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
      <span className="text-2xl">📭</span>
    </div>
    <p className="text-muted-foreground mb-4 max-w-sm">{message}</p>
    {action}
  </div>
);

export const LoadingState = () => (
  <div className="flex items-center justify-center py-16">
    <div className="flex flex-col items-center gap-3">
      <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      <p className="text-muted-foreground text-sm">Chargement…</p>
    </div>
  </div>
);

export const ErrorState = ({ message }: { message?: string }) => (
  <div className="flex items-center justify-center py-16">
    <p className="text-destructive">{message || "Une erreur est survenue."}</p>
  </div>
);

export const PageHeader = ({ title, description, action }: { title: string; description?: string; action?: ReactNode }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
    <div>
      <h1 className="text-section font-bold">{title}</h1>
      {description && <p className="text-muted-foreground mt-1 text-body-lg">{description}</p>}
    </div>
    {action}
  </div>
);
