import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Écran d'erreur plein écran de Globly : une illustration de Globi, un titre en
 * Unbounded, une phrase simple et un ou deux boutons.
 *
 * Il ne dépend ni du routeur, ni de la barre de navigation, ni de la 3D : il
 * doit s'afficher même quand c'est l'application qui a planté, ou sans réseau
 * (liens en <a>, décor en CSS, image et police servies par le site).
 */
export type ErrorKind = '404' | 'panne' | 'hors-ligne' | 'acces-refuse' | 'session-expiree' | 'maintenance' | 'annonce-introuvable';

type Action = { label: string; href?: string; onClick?: () => void };
type Copy = { code: string; title: [before: string, accent: string, after: string]; text: string };

/** Textes par défaut (français) ; les autres langues passent par les clés `err.*`. */
const COPY: Record<ErrorKind, Copy> = {
  '404': { code: 'Erreur 404', title: ["Cette page s'est ", 'perdue', " dans l'espace"], text: "L'adresse n'existe pas ou n'existe plus. Nos Globi la cherchent encore. En attendant, voici deux chemins sûrs." },
  panne: { code: 'Petit souci technique', title: ['On ', 'répare', ', ça ne sera pas long'], text: "Quelque chose s'est mal passé de notre côté. Ce que vous aviez enregistré est toujours là. Réessayez dans un instant." },
  'hors-ligne': { code: 'Hors connexion', title: ['La prise est ', 'débranchée', ''], text: "Votre appareil n'est plus relié à Internet. Vérifiez le Wi-Fi ou les données mobiles : la page reviendra toute seule." },
  'acces-refuse': { code: 'Accès réservé', title: ['Cette porte reste ', 'fermée', ''], text: "Votre compte n'a pas accès à cette page. Si vous pensez que c'est une erreur, écrivez-nous et nous regarderons." },
  'session-expiree': { code: 'Session terminée', title: ['Vous vous êtes ', 'absenté', ' un moment'], text: 'Par sécurité, nous vous avons déconnecté. Reconnectez-vous pour reprendre là où vous en étiez.' },
  maintenance: { code: 'Maintenance en cours', title: ['On refait une ', 'beauté', ' à Globly'], text: 'Le site est en travaux pour quelques instants. Vos annonces et vos messages sont à l\'abri. Revenez un peu plus tard.' },
  'annonce-introuvable': { code: 'Annonce indisponible', title: ['Cette annonce a ', 'baissé le rideau', ''], text: "Elle a été retirée, vendue ou mise en pause par son cédant. D'autres affaires vous attendent juste à côté." },
};

export const ERROR_IMAGES: Record<ErrorKind, string> = {
  '404': '/erreurs/404.webp',
  panne: '/erreurs/panne.webp',
  'hors-ligne': '/erreurs/hors-ligne.webp',
  'acces-refuse': '/erreurs/acces-refuse.webp',
  'session-expiree': '/erreurs/session-expiree.webp',
  maintenance: '/erreurs/maintenance.webp',
  'annonce-introuvable': '/erreurs/annonce-introuvable.webp',
};

const CONTACT = 'contact@globly.com';

interface ErrorScreenProps {
  kind: ErrorKind;
  /** boutons ; ceux par défaut dépendent du type d'erreur */
  actions?: Action[];
  /** par-dessus la page en cours (hors connexion) plutôt qu'à sa place */
  overlay?: boolean;
}

export function ErrorScreen({ kind, actions, overlay = false }: ErrorScreenProps) {
  const { t } = useTranslation();
  const copy = COPY[kind];
  // Le temps de cet écran, les bandeaux et l'assistant du site sont masqués.
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.errorScreen = '1';
    return () => { delete root.dataset.errorScreen; };
  }, []);
  const reload = () => window.location.reload();
  const home: Action = { label: t('err.action_home', "Retour à l'accueil"), href: '/' };
  const retry: Action = { label: t('err.action_retry', 'Réessayer'), onClick: reload };
  const defaults: Record<ErrorKind, Action[]> = {
    '404': [home, { label: t('err.action_listings', 'Voir les annonces'), href: '/marketplace' }],
    panne: [retry, home],
    'hors-ligne': [retry],
    'acces-refuse': [home, { label: t('err.action_contact', 'Nous écrire'), href: `mailto:${CONTACT}` }],
    'session-expiree': [{ label: t('err.action_login', 'Me reconnecter'), href: '/login' }, home],
    maintenance: [retry],
    'annonce-introuvable': [{ label: t('err.action_listings', 'Voir les annonces'), href: '/marketplace' }, { label: t('err.action_map', 'Explorer la carte'), href: '/app' }],
  };
  const buttons = actions || defaults[kind];
  const [before, accent, after] = [
    t(`err.${kind}.title_before`, copy.title[0]),
    t(`err.${kind}.title_accent`, copy.title[1]),
    t(`err.${kind}.title_after`, copy.title[2]),
  ];

  return (
    <div
      role={overlay ? 'alertdialog' : undefined}
      aria-modal={overlay ? true : undefined}
      className={`${overlay ? 'fixed inset-0 z-[2000] overflow-y-auto' : 'relative min-h-[100dvh]'} flex flex-col items-center justify-center px-5 pt-20 pb-10 text-white [text-shadow:none]`}
      style={{ background: '#02020a' }}
    >
      <a href="/" className="absolute top-6 left-6 sm:left-8 flex items-center gap-2.5 text-white font-semibold text-[17px]">
        <img src="/logo.png" alt="" className="h-9 w-auto" /> Globly
      </a>

      {/* L'illustration se fond dans le fond sombre par un masque en ovale */}
      <div
        aria-hidden="true"
        className="w-[min(880px,100%,82vh)] aspect-[1344/752] bg-cover bg-center"
        style={{
          backgroundImage: `url(${ERROR_IMAGES[kind]})`,
          WebkitMaskImage: 'radial-gradient(ellipse 62% 62% at 50% 50%, #000 62%, transparent 100%)',
          maskImage: 'radial-gradient(ellipse 62% 62% at 50% 50%, #000 62%, transparent 100%)',
        }}
      />

      <p className="mt-2 text-xs font-semibold uppercase tracking-[0.32em] text-[#a9a6ff]" style={{ fontFamily: 'Unbounded, system-ui, sans-serif' }}>
        {t(`err.${kind}.code`, copy.code)}
      </p>
      <h1
        className="mt-3.5 mb-3.5 max-w-[17em] text-center font-extrabold leading-[1.08] tracking-[-0.02em] text-white text-[clamp(1.6rem,4.2vw,3.1rem)]"
        style={{ fontFamily: 'Unbounded, system-ui, sans-serif' }}
      >
        {before}<span className="text-[#8f8bff]">{accent}</span>{after}
      </h1>
      <p className="max-w-[34em] text-center text-[clamp(0.95rem,1.25vw,1.125rem)] leading-relaxed text-white/85">
        {t(`err.${kind}.text`, copy.text)}
      </p>

      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        {buttons.map((b, i) => {
          const cls = `h-[50px] px-7 rounded-full inline-flex items-center justify-center text-[15px] font-semibold transition-colors ${
            i === 0 ? 'bg-[#5a55e8] hover:bg-[#6b66f0] text-white' : 'border border-white/30 text-white hover:bg-white/10'
          }`;
          return b.href
            ? <a key={b.label} href={b.href} className={cls}>{b.label}</a>
            : <button key={b.label} type="button" onClick={b.onClick} className={cls}>{b.label}</button>;
        })}
      </div>

      {kind === 'panne' && (
        <p className="mt-5 text-sm text-white/60">
          {t('err.panne.hint', 'Si le problème continue, écrivez-nous :')} <a href={`mailto:${CONTACT}`} className="underline text-white/80">{CONTACT}</a>
        </p>
      )}
    </div>
  );
}
