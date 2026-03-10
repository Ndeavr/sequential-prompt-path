import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

const Home = () => {
  const { isAuthenticated, role } = useAuth();

  const getDashboardLink = () => {
    if (role === "contractor") return "/pro";
    if (role === "admin") return "/admin";
    return "/dashboard";
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="text-center space-y-6 max-w-2xl">
        <h1 className="text-5xl font-bold tracking-tight text-foreground">UNPRO</h1>
        <p className="text-xl text-muted-foreground">
          Intelligence immobilière propulsée par l'IA pour propriétaires et entrepreneurs.
        </p>
        <div className="flex flex-wrap justify-center gap-3 pt-4">
          {isAuthenticated ? (
            <Button asChild size="lg"><Link to={getDashboardLink()}>Mon tableau de bord</Link></Button>
          ) : (
            <>
              <Button asChild size="lg"><Link to="/signup">Créer un compte</Link></Button>
              <Button asChild size="lg" variant="outline"><Link to="/login">Se connecter</Link></Button>
            </>
          )}
          <Button asChild size="lg" variant="outline"><Link to="/search">Trouver un entrepreneur</Link></Button>
        </div>
      </div>
    </div>
  );
};

export default Home;
