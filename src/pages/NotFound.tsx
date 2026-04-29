import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { SolarSystem } from "@/components/SolarSystem";
import { MapPinOff, Home, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-[#2b2a2f] text-white flex items-center justify-center relative overflow-hidden">
      <SolarSystem />
      
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-[#2b2a2f]/80 to-[#2b2a2f]" />

      <div className="relative z-10 p-8 md:p-12 liquid-glass-heavy border border-white/10 rounded-[3rem] max-w-xl text-center w-[90%] mx-auto shadow-2xl">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 ring-1 ring-primary/30 shadow-[0_0_30px_rgba(168,85,247,0.2)]">
          <MapPinOff className="w-10 h-10 text-primary" />
        </div>
        
        <h1 className="text-6xl sm:text-8xl font-light mb-2 text-white tracking-tighter drop-shadow-lg">404</h1>
        <h2 className="text-2xl font-medium mb-6 text-white/90">Destination inconnue</h2>
        
        <p className="text-white/60 font-light mb-10 leading-relaxed text-sm sm:text-base">
          La page que vous recherchez semble avoir été cédée, déplacée, ou n'a peut-être jamais existé dans cette dimension.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/">
            <Button className="w-full rounded-full h-12 px-8 bg-white text-black hover:bg-white/90 transition-all font-medium shadow-[0_0_20px_rgba(255,255,255,0.2)]">
              <Home className="w-4 h-4 mr-2" /> Retour à l'accueil
            </Button>
          </Link>
          <Link to="/marketplace">
            <Button variant="outline" className="w-full rounded-full h-12 px-8 border-white/20 bg-white/5 text-white hover:bg-white/10 transition-all font-light">
              <Search className="w-4 h-4 mr-2" /> Explorer les offres
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;