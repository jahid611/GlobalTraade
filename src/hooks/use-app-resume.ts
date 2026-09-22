import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

// Dans l'app mobile, les paiements se font hors de l'application (navigateur du
// téléphone). Au retour, rien n'aurait rafraîchi l'écran : l'annonce payée
// serait restée verrouillée jusqu'à une action manuelle. `src/native.ts` émet
// `globly:resume` quand l'app redevient active ; on en profite pour réinvalider
// les données sensibles au paiement. No-op sur le web (l'événement n'existe pas).
export function useAppResumeRefresh() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const onResume = () => {
      queryClient.invalidateQueries({ queryKey: ['viewer-plan-v3'] });
      queryClient.invalidateQueries({ queryKey: ['unlock'] });
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      queryClient.invalidateQueries({ queryKey: ['prospects'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    };
    window.addEventListener('globly:resume', onResume);
    return () => window.removeEventListener('globly:resume', onResume);
  }, [queryClient]);
}
