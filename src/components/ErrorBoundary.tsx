import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react';
import { Button } from './ui/button';
import { SolarSystem } from './SolarSystem';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // Met à jour l'état pour que le prochain rendu affiche l'interface de secours.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Vous pouvez également enregistrer l'erreur dans un service d'analyse
    console.error('Erreur attrapée par le ErrorBoundary:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#2b2a2f] text-white flex items-center justify-center relative overflow-hidden">
          <SolarSystem />
          
          <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-900/10 via-[#2b2a2f]/80 to-[#2b2a2f]" />

          <div className="relative z-10 p-8 md:p-12 liquid-glass-heavy border border-white/10 rounded-[3rem] max-w-xl text-center w-[90%] mx-auto shadow-2xl">
            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 ring-1 ring-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
              <AlertTriangle className="w-10 h-10 text-red-500" />
            </div>
            
            <h1 className="text-3xl sm:text-4xl font-light mb-4 text-white tracking-tight">Oups, un imprévu est survenu.</h1>
            
            <p className="text-white/60 font-light mb-10 leading-relaxed text-sm sm:text-base">
              Une erreur inattendue ou une perte de connexion momentanée a interrompu l'application. Pas d'inquiétude, vos données sont en sécurité.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={() => window.location.reload()} 
                className="w-full sm:w-auto rounded-full h-12 px-8 bg-white text-black hover:bg-white/90 transition-all font-medium shadow-[0_0_20px_rgba(255,255,255,0.2)]"
              >
                <RefreshCcw className="w-4 h-4 mr-2" /> Rafraîchir la page
              </Button>
              <Button 
                variant="outline" 
                onClick={() => window.location.href = '/'} 
                className="w-full sm:w-auto rounded-full h-12 px-8 border-white/20 bg-white/5 text-white hover:bg-white/10 transition-all font-light"
              >
                <Home className="w-4 h-4 mr-2" /> Accueil
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}