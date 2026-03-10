/**
 * UNPRO — Pro Dashboard (Contractor)
 *
 * Future features:
 * - Lead management
 * - Analytics and performance metrics
 * - Calendar / appointments
 * - Profile editor
 * - Quote response management
 */

const ProDashboard = () => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <div className="text-center space-y-4 max-w-2xl px-4">
        <h1 className="text-4xl font-bold tracking-tight text-foreground">
          Pro Dashboard
        </h1>
        <p className="text-lg text-muted-foreground">
          Contractor tools, leads, and analytics.
        </p>
        <p className="text-sm text-muted-foreground/60">
          — Pro Dashboard Placeholder (Protected: Contractor Role) —
        </p>
      </div>
    </div>
  );
};

export default ProDashboard;
