"use client";

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

/**
 * Fusée de l'accueil : au clic elle s'allume, décolle, traverse l'espace
 * jusqu'à la Terre, puis l'app arrive sur /app (le globe interactif).
 */

const TARGET = '/app';
const IGNITION_MS = 420;
const FLIGHT_MS = 1900;
const SPACE = '#05050a';

// Zone de la navette dans /rocket.png (le reste de l'image, ce sont les nuages de fumée).
const CROP = { x: 0.37, y: 0.045, w: 0.245, h: 0.43 };
// L'image d'origine moins la navette : celle-ci est redessinée dans l'overlay et s'envole.
const NOTCH = 'polygon(0 0, 37% 0, 37% 47.5%, 61.5% 47.5%, 61.5% 0, 100% 0, 100% 100%, 0 100%)';

const FLAME =
  'linear-gradient(to bottom, #ffffff 0%, #fff1dc 14%, #ffd9a8 28%, rgba(143,138,255,0.85) 55%, rgba(89,85,232,0.35) 78%, rgba(89,85,232,0) 100%)';
const FLAME_RADIUS = '45% 45% 50% 50% / 12% 12% 88% 88%';

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const seg = (u: number, a: number, b: number) => clamp01((u - a) / (b - a));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeIn = (t: number) => t * t * t;
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

interface Flight {
  left: number;
  top: number;
  size: number; // largeur affichée de l'image de la fusée
  w: number;
  h: number;
}

interface ShipProps {
  width: number;
  flameRef: React.Ref<HTMLDivElement>;
}

const Ship = React.forwardRef<HTMLDivElement, ShipProps>(({ width, flameRef }, ref) => {
  const img = width / CROP.w;
  const height = img * CROP.h;
  return (
    <div ref={ref} style={{ position: 'absolute', left: 0, top: 0, width, height, opacity: 0, willChange: 'transform, opacity' }}>
      <div
        ref={flameRef}
        style={{ position: 'absolute', left: '50%', top: height * 0.93, width: width * 0.5, height: height * 1.15, marginLeft: -width * 0.25, transformOrigin: '50% 0' }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            background: FLAME,
            borderRadius: FLAME_RADIUS,
            filter: `blur(${Math.max(2, width * 0.035)}px)`,
            transformOrigin: '50% 0',
            animation: 'rocket-launch-flicker 90ms linear infinite alternate',
          }}
        />
      </div>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'url(/rocket.png)',
          backgroundRepeat: 'no-repeat',
          backgroundSize: `${img}px ${img}px`,
          backgroundPosition: `${-CROP.x * img}px ${-CROP.y * img}px`,
        }}
      />
    </div>
  );
});
Ship.displayName = 'Ship';

// Voile sombre qui survit au changement de page et s'efface sur le globe.
function fadeIntoNextPage() {
  const veil = document.createElement('div');
  veil.style.cssText = `position:fixed;inset:0;z-index:2000;background:${SPACE};pointer-events:none`;
  document.body.appendChild(veil);
  if (typeof veil.animate !== 'function') {
    veil.remove();
    return;
  }
  const fade = veil.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 450, delay: 120, easing: 'ease-out', fill: 'forwards' });
  fade.onfinish = fade.oncancel = () => veil.remove();
}

export const RocketLaunch = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<'idle' | 'ignite' | 'flight'>('idle');
  const [flight, setFlight] = useState<Flight | null>(null);

  const busy = useRef(false);
  const timer = useRef<number | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const backdropRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const launchShipRef = useRef<HTMLDivElement>(null);
  const launchFlameRef = useRef<HTMLDivElement>(null);
  const cruiseShipRef = useRef<HTMLDivElement>(null);
  const cruiseFlameRef = useRef<HTMLDivElement>(null);
  const earthRef = useRef<HTMLDivElement>(null);
  const earthMapRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const veilRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
  }, []);

  const liftOff = useCallback(() => {
    timer.current = null;
    const rect = imgRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) {
      navigate(TARGET);
      return;
    }
    setFlight({ left: rect.left, top: rect.top, size: rect.width, w: window.innerWidth, h: window.innerHeight });
    setPhase('flight');
  }, [navigate]);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Nouvel onglet, clic molette… : on laisse le lien faire son travail.
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (busy.current) {
      e.preventDefault();
      return;
    }
    e.preventDefault();
    busy.current = true;
    setPhase('ignite');
    // Le globe se charge pendant le vol, pour arriver sans écran d'attente.
    void import('@/pages/AppMap').catch(() => undefined);
    timer.current = window.setTimeout(liftOff, IGNITION_MS);
  };

  // Le vol : une seule horloge pilote le fond, les étoiles, la navette et la Terre.
  useLayoutEffect(() => {
    if (!flight) return;
    const { w, h } = flight;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d') ?? null;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }

    const unit = Math.min(w, h);
    const ex = w / 2;
    const ey = h * 0.42;
    const maxR = Math.hypot(Math.max(ex, w - ex), Math.max(ey, h - ey));
    const earthSize = unit * 1.1;

    const shipLeft = flight.left + flight.size * CROP.x;
    const shipTop = flight.top + flight.size * CROP.y;
    const shipH = flight.size * CROP.h;
    const climb = Math.max(0, shipTop) + shipH * 2.6;

    const cruiseW = unit * 0.2;
    const cruiseH = (cruiseW / CROP.w) * CROP.h;
    const fromX = ex + w * 0.16;
    const fromY = h + cruiseH;
    const tilt = Math.atan2(ex - fromX, fromY - ey);

    const count = Math.round(Math.min(260, Math.max(90, (w * h) / 6500)));
    const tint = () => (Math.random() < 0.3 ? '185,182,255' : '255,255,255');
    const rain = Array.from({ length: count }, () => ({ x: Math.random() * w, y: Math.random() * h, z: 0.3 + Math.random() * 0.7, c: tint() }));
    const warp = Array.from({ length: count }, () => ({ a: Math.random() * Math.PI * 2, r: Math.random(), z: 0.35 + Math.random() * 0.65, c: tint() }));

    let raf = 0;
    let start = 0;
    let last = 0;
    let done = false;

    const draw = (u: number, dt: number) => {
      const dark = easeOut(seg(u, 80, 520));
      const veil = easeInOut(seg(u, FLIGHT_MS - 330, FLIGHT_MS));
      if (backdropRef.current) backdropRef.current.style.opacity = String(dark);

      // Décollage : la navette quitte sa place et sort par le haut.
      const lift = easeIn(seg(u, 0, 760));
      if (launchShipRef.current) {
        const jitter = (1 - lift) * 1.5 * Math.sin(u / 14);
        launchShipRef.current.style.transform = `translate3d(${shipLeft + jitter}px, ${shipTop - lift * climb}px, 0)`;
        launchShipRef.current.style.opacity = u < 800 ? '1' : '0';
      }
      if (launchFlameRef.current) launchFlameRef.current.style.transform = `scaleY(${0.55 + 1.3 * lift})`;

      // Croisière : elle revient par le bas et file vers la Terre en rapetissant.
      const q = seg(u, 720, 1560);
      if (cruiseShipRef.current) {
        const e = easeOut(q);
        const x = lerp(fromX, ex, e);
        const y = lerp(fromY, ey, e);
        const s = lerp(1.7, 0.05, 1 - (1 - q) * (1 - q));
        cruiseShipRef.current.style.transform = `translate3d(${x - cruiseW / 2}px, ${y - cruiseH / 2}px, 0) rotate(${tilt}rad) scale(${s})`;
        cruiseShipRef.current.style.opacity = q <= 0 ? '0' : String(1 - seg(u, 1460, 1560));
      }
      if (cruiseFlameRef.current) cruiseFlameRef.current.style.transform = `scaleY(${1.5 - 0.5 * q})`;

      // La Terre apparaît, grossit, puis on plonge dessus.
      if (earthRef.current) {
        const s = u < 1500 ? lerp(0.06, 0.36, easeInOut(seg(u, 640, 1500))) : lerp(0.36, 1.25, Math.pow(seg(u, 1500, FLIGHT_MS), 2));
        earthRef.current.style.transform = `translate3d(${ex - earthSize / 2}px, ${ey - earthSize / 2}px, 0) scale(${s})`;
        earthRef.current.style.opacity = String(seg(u, 640, 900));
      }
      if (earthMapRef.current) earthMapRef.current.style.backgroundPosition = `${-earthSize * (0.7 + u * 0.00015)}px ${-earthSize * 0.14}px`;
      if (flashRef.current) flashRef.current.style.opacity = String(Math.sin(Math.PI * seg(u, 1400, 1820)) * 0.6);
      if (veilRef.current) veilRef.current.style.opacity = String(veil);

      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.lineCap = 'round';

      // Étoiles qui défilent vers le bas pendant la montée…
      const rainAlpha = dark * (1 - seg(u, 640, 860));
      if (rainAlpha > 0.01) {
        const v = 150 + 3200 * lift;
        for (const s of rain) {
          s.y += v * s.z * dt;
          if (s.y > h + 60) {
            s.y = -Math.random() * 60;
            s.x = Math.random() * w;
          }
          ctx.strokeStyle = `rgba(${s.c},${rainAlpha * (0.3 + 0.7 * s.z)})`;
          ctx.lineWidth = s.z * 1.6;
          ctx.beginPath();
          ctx.moveTo(s.x, s.y);
          ctx.lineTo(s.x, s.y - Math.max(1.5, v * s.z * 0.035));
          ctx.stroke();
        }
      }

      // … puis lignes de vitesse qui fuient depuis la Terre, droit devant.
      const warpAlpha = seg(u, 700, 900) * (1 - veil);
      if (warpAlpha > 0.01) {
        const rate = 0.9 + 2.2 * seg(u, 700, 1500);
        for (const s of warp) {
          s.r += (0.05 + s.r) * rate * s.z * dt;
          if (s.r > 1) {
            s.r = 0.04 + Math.random() * 0.14;
            s.a = Math.random() * Math.PI * 2;
          }
          const r1 = s.r * maxR;
          const r0 = Math.max(0, r1 - Math.max(1.5, r1 * 0.09 * rate * s.z));
          const cos = Math.cos(s.a);
          const sin = Math.sin(s.a);
          ctx.strokeStyle = `rgba(${s.c},${warpAlpha * Math.min(1, s.r * 3) * (0.35 + 0.65 * s.z)})`;
          ctx.lineWidth = s.z * (1 + s.r * 1.4);
          ctx.beginPath();
          ctx.moveTo(ex + cos * r0, ey + sin * r0);
          ctx.lineTo(ex + cos * r1, ey + sin * r1);
          ctx.stroke();
        }
      }
    };

    const frame = (now: number) => {
      if (done) return;
      if (!start) {
        start = now;
        last = now;
      }
      const u = now - start;
      draw(Math.min(u, FLIGHT_MS), Math.min(0.05, (now - last) / 1000));
      last = now;
      if (u >= FLIGHT_MS) {
        done = true;
        fadeIntoNextPage();
        navigate(TARGET);
        return;
      }
      raf = requestAnimationFrame(frame);
    };

    draw(0, 0);
    raf = requestAnimationFrame(frame);
    return () => {
      done = true;
      cancelAnimationFrame(raf);
    };
  }, [flight, navigate]);

  const cruiseW = flight ? Math.min(flight.w, flight.h) * 0.2 : 0;
  const earthSize = flight ? Math.min(flight.w, flight.h) * 1.1 : 0;
  const layer: React.CSSProperties = { position: 'absolute', left: 0, top: 0, willChange: 'transform, opacity' };

  return (
    <>
      <Link
        to={TARGET}
        onClick={handleClick}
        className="block group cursor-pointer"
        title={t('index.rocket.title', 'Accéder au globe interactif')}
      >
        <div className="relative transition-transform duration-500 group-hover:-translate-y-4">
          <motion.div
            className="relative"
            animate={phase === 'ignite' ? { x: [0, -1.5, 2, -2, 1.5, -1, 0], y: [0, 1, -1, 1.5, -1.5, 1, 0] } : { x: 0, y: 0 }}
            transition={phase === 'ignite' ? { duration: 0.14, repeat: Infinity, ease: 'linear' } : { duration: 0.1 }}
          >
            <img
              ref={imgRef}
              src="/rocket.png"
              alt={t('index.rocket.alt', 'Fusée de lancement Globly')}
              className="relative z-10 w-full h-auto"
              style={phase === 'flight' ? { clipPath: NOTCH } : undefined}
            />
            {phase === 'ignite' && (
              <>
                <motion.div
                  aria-hidden
                  className="absolute z-20 pointer-events-none"
                  style={{ left: '42.7%', top: '45.5%', width: '13%', height: '26%', transformOrigin: '50% 0', background: FLAME, borderRadius: FLAME_RADIUS, filter: 'blur(5px)' }}
                  initial={{ scaleY: 0, opacity: 0 }}
                  animate={{ scaleY: [0, 0.35, 0.3, 0.6, 0.55, 0.8], opacity: 1 }}
                  transition={{ duration: IGNITION_MS / 1000, ease: 'easeOut' }}
                />
                {[
                  { left: '30%', x: -46 },
                  { left: '54%', x: 46 },
                ].map((puff) => (
                  <motion.div
                    key={puff.left}
                    aria-hidden
                    className="absolute z-20 pointer-events-none rounded-full"
                    style={{ left: puff.left, top: '50%', width: '16%', aspectRatio: '1', background: 'radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.45) 45%, rgba(255,255,255,0) 72%)', filter: 'blur(6px)' }}
                    initial={{ scale: 0.3, opacity: 0, x: 0, y: 0 }}
                    animate={{ scale: 1.9, opacity: [0, 0.75, 0], x: puff.x, y: 26 }}
                    transition={{ duration: (IGNITION_MS + 260) / 1000, ease: 'easeOut' }}
                  />
                ))}
              </>
            )}
          </motion.div>
        </div>
      </Link>

      {flight &&
        createPortal(
          <div
            aria-hidden
            style={{ position: 'fixed', inset: 0, zIndex: 2000, overflow: 'hidden', touchAction: 'none', cursor: 'default' }}
          >
            <style>{'@keyframes rocket-launch-flicker{from{transform:scale(1,1)}to{transform:scale(0.86,0.88)}}'}</style>
            <div
              ref={backdropRef}
              style={{ position: 'absolute', inset: 0, opacity: 0, background: `radial-gradient(120% 90% at 50% 42%, #14132b 0%, #0a0a16 45%, ${SPACE} 100%)` }}
            />
            <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />

            <div ref={earthRef} style={{ ...layer, width: earthSize, height: earthSize, opacity: 0, borderRadius: '50%', boxShadow: '0 0 90px 12px rgba(143,138,255,0.38), 0 0 220px 60px rgba(89,85,232,0.2)' }}>
              <div
                ref={earthMapRef}
                style={{ position: 'absolute', inset: 0, borderRadius: '50%', backgroundImage: 'url(/earth-texture.jpg)', backgroundSize: `${earthSize * 2.56}px ${earthSize * 1.28}px`, backgroundRepeat: 'repeat-x' }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  background: 'radial-gradient(circle at 34% 30%, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 36%, rgba(5,5,10,0.5) 66%, rgba(5,5,10,0.94) 100%)',
                  boxShadow: 'inset 0 0 40px 6px rgba(143,138,255,0.5)',
                }}
              />
            </div>

            <Ship ref={cruiseShipRef} flameRef={cruiseFlameRef} width={cruiseW} />
            <Ship ref={launchShipRef} flameRef={launchFlameRef} width={flight.size * CROP.w} />

            <div
              ref={flashRef}
              style={{ position: 'absolute', inset: 0, opacity: 0, background: 'radial-gradient(circle at 50% 42%, rgba(255,255,255,0.95) 0%, rgba(185,182,255,0.7) 22%, rgba(89,85,232,0.25) 48%, rgba(89,85,232,0) 72%)' }}
            />
            <div ref={veilRef} style={{ position: 'absolute', inset: 0, opacity: 0, background: SPACE }} />
          </div>,
          document.body,
        )}
    </>
  );
};

export default RocketLaunch;
