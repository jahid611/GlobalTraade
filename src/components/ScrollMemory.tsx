"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

/**
 * Mémoire de défilement.
 *
 * Quand on revient en arrière (flèche de la barre de navigation, bouton
 * « Retour », touche précédent du navigateur), on retrouve la page d'avant À
 * L'ENDROIT où on l'avait quittée, et non tout en haut. Une page ouverte par un
 * lien normal commence, elle, en haut.
 *
 * Le navigateur sait faire cela pour des pages classiques, mais ici le contenu
 * arrive après coup (pages chargées à la demande, données Supabase) : au moment
 * du retour la page est encore trop courte. On note donc nous-mêmes la position
 * de chaque étape de l'historique, et on la rétablit dès que la page est
 * redevenue assez haute.
 */
export function ScrollMemory() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const positions = useRef(new Map<string, number>());
  const currentKey = useRef(location.key);
  const restoring = useRef<number | null>(null);

  useEffect(() => {
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        // pendant qu'on rétablit une position, les défilements viennent de nous
        if (restoring.current === null) positions.current.set(currentKey.current, window.scrollY);
      });
    };
    // l'utilisateur reprend la main : on arrête de le ramener à l'ancienne position
    const stop = () => { if (restoring.current !== null) { cancelAnimationFrame(restoring.current); restoring.current = null; } };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("wheel", stop, { passive: true });
    window.addEventListener("touchstart", stop, { passive: true });
    window.addEventListener("keydown", stop);
    return () => {
      window.history.scrollRestoration = previous;
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("wheel", stop);
      window.removeEventListener("touchstart", stop);
      window.removeEventListener("keydown", stop);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  useLayoutEffect(() => {
    if (restoring.current !== null) { cancelAnimationFrame(restoring.current); restoring.current = null; }
    currentKey.current = location.key;

    if (navigationType !== "POP") {
      // page ouverte normalement : on commence en haut (sauf lien vers une ancre)
      if (!location.hash) window.scrollTo(0, 0);
      return;
    }

    const target = positions.current.get(location.key) ?? 0;
    if (target <= 0) { window.scrollTo(0, 0); return; }

    // Retour en arrière : on attend que la page soit assez haute, 4 secondes au plus.
    const started = performance.now();
    const attempt = () => {
      const reachable = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo(0, Math.min(target, Math.max(0, reachable)));
      if (reachable >= target - 2 || performance.now() - started > 4000) {
        restoring.current = null;
        positions.current.set(location.key, window.scrollY);
        return;
      }
      restoring.current = requestAnimationFrame(attempt);
    };
    restoring.current = requestAnimationFrame(attempt);
  }, [location.key, location.hash, navigationType]);

  return null;
}
