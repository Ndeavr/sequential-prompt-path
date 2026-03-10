/**
 * UNPRO — Home Page (Public)
 * 
 * Future features:
 * - Hero section with value proposition
 * - How it works section (3-step flow)
 * - Featured contractors carousel
 * - Testimonials from homeowners
 * - CTA to get a quote or sign up
 * - Footer with navigation links
 */

const Home = () => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <div className="text-center space-y-4 max-w-2xl px-4">
        <h1 className="text-5xl font-bold tracking-tight text-foreground">
          UNPRO
        </h1>
        <p className="text-xl text-muted-foreground">
          AI-powered property intelligence for homeowners and contractors.
        </p>
        <p className="text-sm text-muted-foreground/60">
          — Public Landing Page Placeholder —
        </p>
      </div>
    </div>
  );
};

export default Home;
