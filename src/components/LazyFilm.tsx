import { useCallback, useEffect, useRef, useState } from 'react';

// Film en boucle (maquettes de l'accueil et de la connexion).
// Il n'est téléchargé que lorsqu'il approche de l'écran, et se met en pause
// dès qu'il en sort : un visiteur qui ne descend pas jusque-là ne le charge pas.
export function LazyFilm({ src, className }: { src: string; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const visible = useRef(false);
  const [near, setNear] = useState(false);

  // La lecture est relancée à chaque occasion (film prêt, retour à l'écran) :
  // certains navigateurs ignorent la lecture automatique d'un film dont
  // l'adresse a été posée après coup.
  const play = useCallback(() => {
    const el = ref.current;
    if (!el || !visible.current) return;
    el.muted = true;
    el.play?.().catch(() => {});
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') { visible.current = true; setNear(true); return; }
    const io = new IntersectionObserver(([entry]) => {
      visible.current = entry.isIntersecting;
      if (entry.isIntersecting) { setNear(true); play(); }
      else el.pause?.();
    }, { rootMargin: '300px' });
    io.observe(el);
    return () => io.disconnect();
  }, [play]);

  // une fois l'adresse du film posée dans la page, on lance la lecture
  useEffect(() => { if (near) play(); }, [near, src, play]);

  return (
    <video
      ref={ref}
      key={src}
      src={near ? src : undefined}
      preload={near ? 'auto' : 'none'}
      autoPlay={near}
      onLoadedData={play}
      onCanPlay={play}
      loop muted playsInline
      className={className}
    />
  );
}
