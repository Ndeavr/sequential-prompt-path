import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import PageSafeFallbackRedirect from "@/pages/PageSafeFallbackRedirect";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return <PageSafeFallbackRedirect />;
};

export default NotFound;
