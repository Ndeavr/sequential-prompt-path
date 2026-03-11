import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import type { ReactNode } from "react";

/* ─── Stat Card ─── */
interface StatCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  description?: string;
  trend?: { value: string; positive?: boolean };
}

export const StatCard = ({ title, value, icon, description, trend }: StatCardProps) => (
  <Card className="relative overflow-hidden border-border/40 bg-card/80">
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-caption font-medium text-muted-foreground uppercase tracking-wider">{title}</CardTitle>
      {icon && <div className="h-7 w-7 rounded-lg bg-primary/8 flex items-center justify-center text-primary">{icon}</div>}
    </CardHeader>
    <CardContent>
      <div className="text-xl font-display font-bold tracking-tight">{value}</div>
      <div className="flex items-center gap-2 mt-1">
        {trend && (
          <span className={`text-caption font-semibold ${trend.positive ? "text-success" : "text-destructive"}`}>
            {trend.positive ? "↑" : "↓"} {trend.value}
          </span>
        )}
        {description && <p className="text-caption text-muted-foreground">{description}</p>}
      </div>
    </CardContent>
  </Card>
);

/* ─── Empty State ─── */
export const EmptyState = ({ message, action, icon }: { message: string; action?: ReactNode; icon?: ReactNode }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="h-14 w-14 rounded-2xl bg-muted/60 flex items-center justify-center mb-4">
      {icon || <span className="text-xl opacity-40">📭</span>}
    </div>
    <p className="text-muted-foreground mb-4 max-w-xs text-meta leading-relaxed">{message}</p>
    {action}
  </div>
);

/* ─── Loading State ─── */
export const LoadingState = () => (
  <div className="flex items-center justify-center py-20">
    <div className="flex flex-col items-center gap-3">
      <div className="h-7 w-7 rounded-full border-2 border-primary/60 border-t-transparent animate-spin" />
      <p className="text-muted-foreground text-caption">Chargement…</p>
    </div>
  </div>
);

/* ─── Error State ─── */
export const ErrorState = ({ message }: { message?: string }) => (
  <div className="flex items-center justify-center py-20">
    <div className="text-center space-y-2">
      <div className="h-11 w-11 mx-auto rounded-xl bg-destructive/8 flex items-center justify-center">
        <span className="text-base">⚠️</span>
      </div>
      <p className="text-destructive font-medium text-meta">{message || "Une erreur est survenue."}</p>
    </div>
  </div>
);

/* ─── Page Header ─── */
export const PageHeader = ({ title, description, action, badge }: { title: string; description?: string; action?: ReactNode; badge?: string }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
    <div>
      <div className="flex items-center gap-2.5">
        <h1 className="font-display text-title">{title}</h1>
        {badge && (
          <span className="px-2.5 py-0.5 rounded-full bg-success/10 text-success text-caption font-semibold border border-success/15">{badge}</span>
        )}
      </div>
      {description && <p className="text-muted-foreground mt-1 text-meta leading-relaxed">{description}</p>}
    </div>
    {action}
  </div>
);

/* ─── Upload Zone ─── */
export const UploadZone = ({ label, description, onUpload, accept, disabled }: {
  label: string;
  description?: string;
  onUpload?: (files: FileList) => void;
  accept?: string;
  disabled?: boolean;
}) => (
  <label className={`upload-zone flex flex-col items-center cursor-pointer ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}>
    <div className="h-12 w-12 rounded-2xl bg-primary/6 flex items-center justify-center mb-3">
      <Upload className="h-5 w-5 text-primary/50" />
    </div>
    <p className="text-meta font-semibold text-foreground">{label}</p>
    {description && <p className="text-caption text-muted-foreground mt-1">{description}</p>}
    <input
      type="file"
      className="sr-only"
      accept={accept}
      disabled={disabled}
      onChange={(e) => e.target.files && onUpload?.(e.target.files)}
    />
  </label>
);

/* ─── Section Wrapper ─── */
export const Section = ({ children, className = "", gradient = false }: { children: ReactNode; className?: string; gradient?: boolean }) => (
  <section className={`relative px-5 py-12 ${gradient ? "section-gradient" : ""} ${className}`}>
    <div className="relative z-10 max-w-lg mx-auto">
      {children}
    </div>
  </section>
);

/* ─── Section Title ─── */
export const SectionTitle = ({ overline, title, description }: { overline?: string; title: string; description?: string }) => (
  <div className="text-center mb-8">
    {overline && <p className="text-caption font-semibold text-primary tracking-widest uppercase mb-2">{overline}</p>}
    <h2 className="font-display text-section text-foreground">{title}</h2>
    {description && <p className="text-meta text-muted-foreground mt-2 max-w-md mx-auto leading-relaxed">{description}</p>}
  </div>
);
