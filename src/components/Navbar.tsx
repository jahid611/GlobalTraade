"use client";

import React, { useState, useEffect } from "react";
import { LanguageMenu, LanguageFlag } from "@/components/LanguageMenu";
import { LANGUAGES } from "@/locales";
import { setLanguage } from "@/i18n";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  List,
  X,
  ChatCircle,
  SignOut,
  Gear,
  User as UserIcon,
  Globe,
  Storefront,
  SquaresFour,
  Sun,
  Moon,
  Translate,
  Handshake,
  UsersThree,
  Crosshair,
  Briefcase,
  ArrowLeft,
} from "phosphor-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useUnreadMessages } from "@/hooks/use-unread-messages";
import { NotificationsMenu } from "@/components/NotificationsMenu";
import { useScrollLock } from "@/hooks/use-scroll-lock";
import { useTheme } from "next-themes";
import { markIntentionalSignOut } from "@/lib/sessionMemory";
import { useAuth } from "@/components/AuthProvider";
import { useTranslation } from "react-i18next";
import { usePlan, PlanType } from "@/services/planService";

// Badge du plan actuel de l'utilisateur
// `className` : la pastille (menu du téléphone). `text` : la couleur du nom de
// la formule dans le menu du compte (ordinateur). Palette du site, pas de cyan.
const PLAN_BADGE: Record<PlanType, { label: string; className: string; text: string }> = {
  free:     { label: "Gratuit",  className: "bg-white/10 text-white/70 border-white/15", text: "text-white/70" },
  pro:      { label: "Pro",      className: "bg-primary/20 text-primary border-primary/40", text: "text-[#c7c4ff]" },
  business: { label: "Business", className: "bg-white/10 text-white border-white/25", text: "text-white" },
};

// Le profil affiché dans la barre (nom, photo) est gardé d'une page à l'autre et
// d'une visite à l'autre. Sans cela, chaque page remontait la barre sans profil :
// on voyait l'initiale sur fond violet le temps que la photo revienne.
type NavProfile = { full_name?: string | null; avatar_url?: string | null };
const NAV_PROFILE_KEY = "globly.navProfile";
let navProfileMemo: { id: string; profile: NavProfile } | null = null;
function readNavProfile(userId?: string): NavProfile | null {
  if (!userId) return null;
  if (navProfileMemo?.id === userId) return navProfileMemo.profile;
  try {
    const saved = JSON.parse(localStorage.getItem(NAV_PROFILE_KEY) || "null");
    if (saved?.id === userId && saved.profile) {
      navProfileMemo = saved;
      return saved.profile;
    }
  } catch { /* stockage indisponible : on fera sans */ }
  return null;
}
function saveNavProfile(userId: string, profile: NavProfile) {
  navProfileMemo = { id: userId, profile };
  try { localStorage.setItem(NAV_PROFILE_KEY, JSON.stringify(navProfileMemo)); } catch { /* idem */ }
}
function clearNavProfile() {
  navProfileMemo = null;
  try { localStorage.removeItem(NAV_PROFILE_KEY); } catch { /* idem */ }
}

export function Navbar() {
  // `resolvedTheme` : avec `enableSystem`, `theme` peut valoir "system".
  const { resolvedTheme, setTheme } = useTheme();
  const { user } = useAuth();
  const { t, i18n } = useTranslation();

  const [profile, setProfile] = useState<NavProfile | null>(() => readNavProfile(user?.id));
  // photo qui n'a pas pu se charger : on retombe sur l'initiale
  const [avatarBroken, setAvatarBroken] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const hasUnread = useUnreadMessages(user?.id);
  const { plan } = usePlan(user?.id);
  const planBadge = PLAN_BADGE[plan];

  useScrollLock(isMobileMenuOpen);

  const NAV_LINKS = [
    { name: t("nav.market"), path: "/marketplace", icon: Storefront },
    { name: t("nav.prospect"), path: "/radar", icon: Crosshair },
    { name: t("nav.projects"), path: "/projects", icon: Handshake },
    { name: t("nav.sector"), path: "/secteur", icon: UsersThree },
    { name: t("nav.partners", "Partenaires"), path: "/partenaire", icon: Briefcase },
    { name: t("nav.map"), path: "/app", icon: Globe },
    { name: t("nav.dashboard"), path: "/dashboard", icon: SquaresFour },
  ];

  useEffect(() => {
    if (user) {
      const fetchProfile = async () => {
        const { data } = await supabase
          .from("profiles")
          .select("full_name, avatar_url")
          .eq("id", user.id)
          .single();
        if (data) {
          saveNavProfile(user.id, data);
          setProfile(data);
        }
      };
      // d'abord ce que l'on connaît déjà, puis la version à jour
      setProfile(readNavProfile(user.id));
      fetchProfile();
    } else {
      setProfile(null);
    }
  }, [user]);

  const handleLogout = async () => {
    clearNavProfile();
    markIntentionalSignOut();
    await supabase.auth.signOut();
    navigate("/");
  };


  const toggleTheme = (e: React.MouseEvent) => {
    e.preventDefault();
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  const getAvatarUrl = () =>
    profile?.avatar_url ||
    user?.user_metadata?.avatar_url ||
    user?.user_metadata?.picture;
  const getUserName = () =>
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "User";

  const renderLogoMenuContent = () => (
    <>
      {user ? (
        <>
          <DropdownMenuItem
            onClick={() => navigate("/profile")}
            className="rounded-xl px-4 py-3 cursor-pointer hover:bg-white/10 flex items-center transition-all text-sm font-light"
          >
            <UserIcon className="mr-3 h-4 w-4 text-primary" />{" "}
            {t("nav.profile")}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => navigate("/settings")}
            className="rounded-xl px-4 py-3 cursor-pointer hover:bg-white/10 flex items-center transition-all text-sm font-light"
          >
            <Gear className="mr-3 h-4 w-4 text-primary" />{" "}
            {t("nav.settings")}
          </DropdownMenuItem>
        </>
      ) : (
        <DropdownMenuItem
          onClick={() => navigate("/login")}
          className="rounded-xl px-4 py-3 cursor-pointer hover:bg-white/10 flex items-center transition-all text-sm font-light"
        >
          <UserIcon className="mr-3 h-4 w-4 text-primary" /> {t("nav.login")}
        </DropdownMenuItem>
      )}
      <DropdownMenuSeparator className="bg-white/10 my-1" />

      <DropdownMenuItem
        // on garde le menu ouvert : la liste des langues se déplie juste dessous
        onSelect={(e) => { e.preventDefault(); setLangOpen((v) => !v); }}
        aria-expanded={langOpen}
        className="rounded-xl px-4 py-3 cursor-pointer flex items-center justify-between transition-all text-sm font-light"
      >
        <div className="flex items-center">
          <Translate className="mr-3 h-4 w-4 text-blue-400" />
          {t("lang.switch")}
        </div>
        <span className="flex items-center gap-2">
          <LanguageFlag code={i18n.language} size={20} />
          <span aria-hidden="true" className={`text-white/50 text-xs transition-transform ${langOpen ? "rotate-180" : ""}`}>▾</span>
        </span>
      </DropdownMenuItem>
      {langOpen && (
        <div className="mx-2 mb-1 rounded-xl p-1" style={{ background: "rgba(255,255,255,0.05)" }}>
          {LANGUAGES.map((l) => (
            <DropdownMenuItem
              key={l.code}
              onSelect={(e) => { e.preventDefault(); void setLanguage(l.code); }}
              className="rounded-lg px-3 py-2.5 cursor-pointer flex items-center gap-3 text-sm font-light"
            >
              <LanguageFlag code={l.code} size={20} />
              <span className="flex-1">{l.label}</span>
              {(i18n.language || "fr").slice(0, 2) === l.code && <span aria-hidden="true" style={{ color: "#a5b4fc" }}>✓</span>}
            </DropdownMenuItem>
          ))}
        </div>
      )}

      <DropdownMenuItem
        onClick={toggleTheme}
        className="rounded-xl px-4 py-3 cursor-pointer hover:bg-white/10 flex items-center transition-all text-sm font-light"
      >
        {resolvedTheme === "dark" ? (
          <Moon className="mr-3 h-4 w-4 text-slate-300" />
        ) : (
          <Sun className="mr-3 h-4 w-4 text-yellow-400" />
        )}
        {resolvedTheme === "dark" ? t("theme.dark") : t("theme.light")}
      </DropdownMenuItem>

      {user && (
        <>
          <DropdownMenuSeparator className="bg-white/10 my-1" />
          <DropdownMenuItem
            onClick={handleLogout}
            className="text-red-400 rounded-xl px-4 py-3 cursor-pointer hover:bg-red-500/20 flex items-center transition-all text-sm font-light"
          >
            <SignOut className="mr-3 h-4 w-4" /> {t("nav.logout")}
          </DropdownMenuItem>
        </>
      )}
    </>
  );

  return (
    <>
      <div
        className="h-[100px] sm:h-[120px] w-full pointer-events-none shrink-0"
        aria-hidden="true"
      />

      <nav className="fixed top-[calc(env(safe-area-inset-top,0px)+1rem)] sm:top-[calc(env(safe-area-inset-top,0px)+1.5rem)] left-1/2 -translate-x-1/2 z-[100] w-[94%] max-w-6xl pointer-events-none">
        <div className="bg-black/10 backdrop-blur-sm border border-white/10 shadow-lg px-3 min-[400px]:px-4 sm:px-6 py-3 sm:py-3.5 rounded-full flex items-center justify-between relative overflow-visible pointer-events-auto min-h-[72px]">
          <div className="flex items-center gap-2 sm:gap-6">
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="relative group flex shrink-0 mr-1 sm:mr-4">
                <Link to="/" aria-label={t("nav.home")} className="relative z-10 flex items-center">
                  <img
                    src="/logo.png"
                    alt="Logo"
                    className="h-14 sm:h-16 w-auto object-contain transition-transform hover:scale-105"
                  />
                </Link>
                <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1 rounded-lg bg-[#211f25] border border-white/10 text-white text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-75 shadow-xl z-[120]">
                  {t("nav.home")}
                </span>
              </div>

              {/* Flèche de retour intégrée à la navbar (à droite du logo),
                  masquée là où elle n'a pas de sens (accueil, login, carte). */}
              {!["/", "/login", "/app"].includes(location.pathname) && (
                <button
                  onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/dashboard"))}
                  aria-label={t("nav.back", "Retour")}
                  className="shrink-0 w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-all"
                >
                  <ArrowLeft className="w-[18px] h-[18px]" weight="bold" />
                </button>
              )}

              <div className="hidden lg:flex items-center gap-2">

              {NAV_LINKS.map((link) => {
                const Icon = link.icon;
                const active = location.pathname === link.path;
                return (
                  <div key={link.name} className="relative group flex">
                    <Link
                      to={link.path}
                      aria-label={link.name}
                      className={`flex w-9 h-9 sm:w-10 sm:h-10 items-center justify-center rounded-full transition-all ${active ? "text-white bg-white/10" : "text-white/70 hover:text-white hover:bg-white/10"}`}
                    >
                      <Icon className="w-[18px] h-[18px]" />
                    </Link>
                    <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1 rounded-lg bg-[#211f25] border border-white/10 text-white text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-75 shadow-xl z-[120]">
                      {link.name}
                    </span>
                  </div>
                );
              })}
              </div>

              <div className="hidden lg:flex items-center gap-1 ml-2 border-l border-white/20 pl-3">
                <LanguageMenu />
                <button
                  onClick={toggleTheme}
                  className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full hover:bg-transparent text-white/70 hover:text-white transition-all"
                >
                  {resolvedTheme === "dark" ? (
                    <Moon className="w-[18px] h-[18px]" />
                  ) : (
                    <Sun className="w-[18px] h-[18px]" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-5 shrink-0">
            {/* Menu replié (téléphone, tablette) : la langue et le thème se changent depuis
                la barre (sur ordinateur, ces deux boutons sont à gauche, après les icônes).
                La langue cède sa place sur les tout petits écrans, où elle ne tient pas. */}
            <div className="lg:hidden flex items-center shrink-0">
              <div className="max-[359px]:hidden">
                <LanguageMenu
                  align="left"
                  flagSize={22}
                  className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
                />
              </div>
              <button
                onClick={toggleTheme}
                aria-label={t("theme.toggle", "Changer de thème")}
                className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-all"
              >
                {resolvedTheme === "dark" ? (
                  <Moon className="w-[18px] h-[18px]" />
                ) : (
                  <Sun className="w-[18px] h-[18px]" />
                )}
              </button>
            </div>

            {user ? (
              <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                <div className="relative group flex shrink-0">
                  <NotificationsMenu user={user} />
                  <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1 rounded-lg bg-[#211f25] border border-white/10 text-white text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-75 shadow-xl z-[120]">
                    {t('notif.title', 'Notifications')}
                  </span>
                </div>

                <Link
                  to="/messages"
                  aria-label={t('nav.messages', 'Messages')}
                  className="hidden sm:flex relative items-center justify-center text-white/60 hover:text-white transition-colors outline-none group p-1.5 sm:p-2 cursor-pointer"
                >
                  <ChatCircle
                    className="w-5 h-5 sm:w-[22px] sm:h-[22px] group-hover:scale-110 transition-transform duration-300"
                    weight="regular"
                  />
                  {hasUnread && (
                    <span className="absolute top-1 right-1.5 w-2 h-2 sm:w-2.5 sm:h-2.5 bg-red-500 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.8)] border border-[#2b2a2f]" />
                  )}
                  <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1 rounded-lg bg-[#211f25] border border-white/10 text-white text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-75 shadow-xl z-[120]">
                    {t('nav.messages', 'Messages')}
                  </span>
                </Link>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="relative h-9 w-9 sm:h-10 sm:w-10 shrink-0 rounded-full overflow-hidden outline-none hover:scale-105 transition-transform hover:ring-2 hover:ring-white/20 sm:ml-1">
                      {(() => {
                        const url = getAvatarUrl();
                        // Une photo existe : on l'affiche directement, jamais l'initiale à sa place.
                        if (url && avatarBroken !== url) {
                          return <img src={url} alt="" onError={() => setAvatarBroken(url)} className="h-full w-full rounded-full object-cover" />;
                        }
                        // Profil pas encore connu : rond neutre, le temps de savoir s'il y a une photo.
                        if (!url && profile === null) return <span className="block h-full w-full rounded-full bg-white/10" />;
                        // Pas de photo enregistrée : l'initiale.
                        return (
                          <span className="flex h-full w-full items-center justify-center rounded-full bg-primary/30 text-white font-medium text-sm">
                            {getUserName().charAt(0).toUpperCase()}
                          </span>
                        );
                      })()}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="w-64 bg-[#1c1b20]/95 backdrop-blur-2xl border border-white/10 text-white rounded-[1.5rem] p-2 shadow-[0_20px_60px_rgba(0,0,0,0.7)] z-[110] overflow-hidden"
                    align="end"
                    sideOffset={16}
                  >
                    <DropdownMenuLabel className="px-4 py-3 mb-1">
                      <p className="text-sm font-medium truncate">{getUserName()}</p>
                      <p className="text-[10px] text-white/50 truncate mt-0.5">
                        {user.email}
                      </p>
                      {/* La formule, sur sa propre ligne sous l'identité : elle ne serre plus le nom */}
                      <Link
                        to="/payment"
                        title={t('plan.current', 'Votre formule actuelle')}
                        className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] px-3 py-2 transition-colors"
                      >
                        <span className="text-[10px] uppercase tracking-widest text-white/50 font-medium">{t('plan.word', 'Formule')}</span>
                        <span className={`text-xs font-semibold ${planBadge.text}`}>{planBadge.label}</span>
                      </Link>
                      {plan === 'free' && (
                        <Link to="/payment" className="text-[10px] text-primary hover:text-primary/80 font-medium mt-2 inline-block">
                          {t('plan.upgrade', 'Améliorer ma formule →')}
                        </Link>
                      )}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-white/10 mb-1" />
                    {renderLogoMenuContent()}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Link to="/login">
                  <Button
                    variant="ghost"
                    className="text-white/60 hover:text-white hover:bg-white/10 px-4 rounded-full h-10 transition-all font-light"
                  >
                    {t("nav.login")}
                  </Button>
                </Link>
                <Link to="/login" state={{ mode: "signup" }}>
                  <Button className="bg-primary text-white hover:bg-primary/90 px-5 rounded-full h-10 transition-all font-medium">
                    {t("nav.signup")}
                  </Button>
                </Link>
              </div>
            )}

            {/* La pilule ne s'affiche que là où elle tient sans rien pousser hors de la barre :
                avec le menu replié (tablette, une fois connecté) et sur grand écran.
                Entre les deux, l'icône de la carte dans la barre fait le même travail. */}
            <Link to="/app" className={`shrink-0 hidden ${user ? "md:block lg:hidden" : ""} xl:block`}>
              {/* Fond : un planisphère de la Terre, assombri pour que le texte reste lisible */}
              <Button className="bg-[linear-gradient(rgba(4,6,20,0.62),rgba(4,6,20,0.62)),url('/earth/pilule.jpg')] hover:bg-[linear-gradient(rgba(4,6,20,0.42),rgba(4,6,20,0.42)),url('/earth/pilule.jpg')] bg-cover bg-center border border-white/25 text-white [text-shadow:0_1px_2px_rgba(0,0,0,1),0_0_10px_rgba(0,0,0,0.9)] px-5 h-10 font-semibold tracking-wide rounded-full transition-all shadow-none ring-0 outline-none focus:ring-0">
                {t("nav.explore")}
              </Button>
            </Link>

            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden shrink-0 w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors pointer-events-auto sm:ml-1"
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[999] bg-[#1c1b20]/75 backdrop-blur-2xl flex flex-col px-6 overflow-hidden"
            style={{
              paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1.5rem)',
              paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.5rem)',
            }}
          >
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
              <motion.div
                animate={{ scale: [1, 1.1, 1], opacity: [0.08, 0.15, 0.08] }}
                transition={{
                  duration: 8,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute -top-[10%] -left-[20%] w-[50vw] h-[50vw] rounded-full bg-primary/20 blur-[100px]"
              />
            </div>

            <div className="relative z-10 flex justify-between items-center mb-8">
              <Link to="/" onClick={() => setIsMobileMenuOpen(false)}>
                <img src="/logo.png" alt="Logo" className="h-12 object-contain" />
              </Link>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 text-white transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="relative z-10 flex flex-col gap-6 flex-1 justify-center px-4">
              {NAV_LINKS.map((link, i) => {
                const Icon = link.icon;
                return (
                  <motion.div
                    key={link.name}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * (i + 1) }}
                  >
                    <Link
                      to={link.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="text-2xl font-normal text-white transition-colors flex items-center gap-4"
                    >
                      <Icon className="w-6 h-6 shrink-0" /> {link.name}
                    </Link>
                  </motion.div>
                );
              })}
              {user && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <Link
                    to="/messages"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="text-2xl font-normal text-white transition-colors flex items-center gap-4"
                  >
                    <ChatCircle className="w-6 h-6 shrink-0" />{" "}
                    {t("nav.messages")}{" "}
                    {hasUnread && (
                      <div className="w-2.5 h-2.5 bg-red-500 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
                    )}
                  </Link>
                </motion.div>
              )}
            </div>

            <div className="relative z-10 pt-8 border-t border-white/10 flex flex-col items-start gap-3 mt-auto w-full px-4">
              {!user ? (
                <div className="flex flex-col items-start gap-3 w-full">
                  <Button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      navigate("/login");
                    }}
                    className="w-fit px-8 h-12 rounded-full bg-white/5 border border-white/10 hover:bg-white/15 text-white font-light text-base transition-all shadow-none"
                  >
                    {t("nav.login")}
                  </Button>
                  <Button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      navigate("/login", { state: { mode: "signup" } });
                    }}
                    className="w-fit px-8 h-12 rounded-full bg-primary/20 backdrop-blur-md border border-primary/30 hover:bg-primary/40 text-white font-medium text-base transition-all shadow-none"
                  >
                    {t("nav.signup")}
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      navigate("/profile");
                    }}
                    className="w-fit px-8 h-12 rounded-full bg-white/5 border border-white/10 hover:bg-white/15 text-white font-light text-base transition-all shadow-none"
                  >
                    {t("nav.profile")}
                  </Button>
                  <Link
                    to="/payment"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`shrink-0 text-xs font-bold uppercase tracking-wider px-3 py-2 rounded-full border ${planBadge.className}`}
                    title={t('plan.current', 'Votre formule actuelle')}
                  >
                    {planBadge.label}
                  </Link>
                </div>
              )}

              <div className="flex items-center gap-2 mt-2">
                <Button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    navigate("/app");
                  }}
                  // même fond que la pilule de la barre sur ordinateur : le planisphère, assombri
                  className="w-fit px-8 h-12 rounded-full bg-[linear-gradient(rgba(4,6,20,0.62),rgba(4,6,20,0.62)),url('/earth/pilule.jpg')] hover:bg-[linear-gradient(rgba(4,6,20,0.42),rgba(4,6,20,0.42)),url('/earth/pilule.jpg')] bg-cover bg-center border border-white/25 text-white [text-shadow:0_1px_2px_rgba(0,0,0,1),0_0_10px_rgba(0,0,0,0.9)] font-semibold tracking-wide text-base transition-all shadow-none"
                >
                  {t("nav.explore")}
                </Button>
                <div className="flex gap-2">
                  <LanguageMenu placement="top" className="w-12 h-12 flex items-center justify-center rounded-full outline-none" />
                  <Button
                    onClick={toggleTheme}
                    variant="ghost"
                    className="w-12 h-12 rounded-full bg-transparent border-none p-0 text-white shadow-none hover:bg-transparent"
                  >
                    {resolvedTheme === "dark" ? (
                      <Moon className="w-5 h-5" />
                    ) : (
                      <Sun className="w-5 h-5" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}