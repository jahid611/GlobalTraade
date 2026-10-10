import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react';
import { Button } from './ui/button';
import { captureBoundaryError } from '@/monitoring';

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
    console.error('Erreur attrapée par le ErrorBoundary:', error, errorInfo);
    // Remontée vers Sentry en production (no-op sans DSN configurée)
    captureBoundaryError(error, errorInfo.componentStack);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#2b2a2f] text-white flex items-center justify-center relative overflow-hidden">
          {/* Décor 100 % CSS : ni WebGL ni ressource distante. Le fallback doit
              s'afficher même si c'est la 3D qui a planté ou si le réseau est coupé. */}
          <div aria-hidden="true" className="absolute inset-0 z-0 pointer-events-none">
            <div className="absolute -top-[20%] -left-[10%] w-[60vw] h-[60vw] rounded-full bg-[#a855f7]/10 blur-3xl" />
            <div className="absolute -bottom-[25%] -right-[10%] w-[55vw] h-[55vw] rounded-full bg-[#3b82f6]/10 blur-3xl" />
            <div
              className="absolute inset-0 opacity-40"
              style={{
                backgroundImage:
                  'radial-gradient(1px 1px at 12% 22%, rgba(255,255,255,0.7) 50%, transparent 51%),' +
                  'radial-gradient(1px 1px at 78% 14%, rgba(255,255,255,0.5) 50%, transparent 51%),' +
                  'radial-gradient(1.5px 1.5px at 34% 71%, rgba(255,255,255,0.6) 50%, transparent 51%),' +
                  'radial-gradient(1px 1px at 61% 48%, rgba(255,255,255,0.4) 50%, transparent 51%),' +
                  'radial-gradient(1.5px 1.5px at 89% 79%, rgba(255,255,255,0.6) 50%, transparent 51%),' +
                  'radial-gradient(1px 1px at 22% 90%, rgba(255,255,255,0.5) 50%, transparent 51%),' +
                  'radial-gradient(1px 1px at 47% 9%, rgba(255,255,255,0.6) 50%, transparent 51%)',
              }}
            />
          </div>
          
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