import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ErrorScreen } from './ErrorScreen';
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
      return <ErrorScreen kind="panne" />;
    }

    return this.props.children;
  }
}