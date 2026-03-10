/**
 * UNPRO — Search Page (Public)
 *
 * Future features:
 * - Full-text search for contractors by name, specialty, location
 * - Filter by AIPP score, rating, availability
 * - Map view integration
 * - SEO-optimized search result pages
 */

const Search = () => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <div className="text-center space-y-4 max-w-2xl px-4">
        <h1 className="text-4xl font-bold tracking-tight text-foreground">
          Search Contractors
        </h1>
        <p className="text-lg text-muted-foreground">
          Find the right contractor for your project.
        </p>
        <p className="text-sm text-muted-foreground/60">
          — Search Page Placeholder —
        </p>
      </div>
    </div>
  );
};

export default Search;
