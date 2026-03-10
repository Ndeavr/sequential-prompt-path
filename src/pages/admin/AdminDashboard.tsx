/**
 * UNPRO — Admin Dashboard
 *
 * Future features:
 * - User management
 * - Contractor verification queue
 * - Platform analytics
 * - Content moderation
 * - System configuration
 */

const AdminDashboard = () => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <div className="text-center space-y-4 max-w-2xl px-4">
        <h1 className="text-4xl font-bold tracking-tight text-foreground">
          Admin Panel
        </h1>
        <p className="text-lg text-muted-foreground">
          Platform administration and moderation.
        </p>
        <p className="text-sm text-muted-foreground/60">
          — Admin Dashboard Placeholder (Protected: Admin Role) —
        </p>
      </div>
    </div>
  );
};

export default AdminDashboard;
