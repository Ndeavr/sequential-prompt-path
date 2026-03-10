/**
 * UNPRO — Home Score Page (Dashboard)
 * 
 * Future features:
 * - Property overview card with current score
 * - Score breakdown by category (structure, systems, exterior, interior)
 * - Property knowledge graph timeline
 * - Maintenance recommendations
 * - Score trend chart over time
 * - Action items for score improvement
 */

const HomeScore = () => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <div className="text-center space-y-4 max-w-2xl px-4">
        <h1 className="text-4xl font-bold tracking-tight text-foreground">
          Home Score
        </h1>
        <p className="text-lg text-muted-foreground">
          Your property's condition score with actionable improvement insights.
        </p>
        <p className="text-sm text-muted-foreground/60">
          — Home Score Page Placeholder (Protected: Dashboard) —
        </p>
      </div>
    </div>
  );
};

export default HomeScore;
