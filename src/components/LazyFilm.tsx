import { useEffect, useRef, useState } from 'react';

// Film en boucle (maquettes de l'accueil et de la connexion).
// Il n'est téléchargé que lorsqu'il approche de l'écran, et se met en pause
// dès qu'il en sort : un visiteur qui ne descend pas jusque-là ne le charge pas.
export function LazyFilm({ src, className }: { src: string; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') { setNear(true); return; }
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setNear(true);
        el.muted = true;
        el.play?.().catch(() => {});
      } else {
        el.pause?.();
      }
    }, { rootMargin: '200px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <video
      ref={ref}
      key={src}
      src={near ? src : undefined}
      preload={near ? 'metadata' : 'none'}
      autoPlay={near}
      loop muted playsInline
      className={className}
    />
  );
}
