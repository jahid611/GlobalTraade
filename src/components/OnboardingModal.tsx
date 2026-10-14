"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, ChevronRight, ChevronLeft, Check, Target, Store, TrendingUp, Handshake } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Dropdown } from "@/components/PickerKit";
import { ROLE_FUNCTIONS, ROLE_FUNCTION_LABELS } from "@/lib/ranges";
import { marketCountryOptions } from "@/lib/geoRegions";
import { DEFAULT_COUNTRY } from "@/lib/countries";
import { marketOf } from "@/lib/markets";
import { BuyerProjectForm } from "@/components/settings/BuyerProjectForm";
import { BUYER_ROLE_DEFAULTS, REQUIRED_FIELDS, emptyBuyerProject, missingRequired, serializeBuyerProject, type BuyerProject, type ProjectSection } from "@/lib/buyerProject";
import { LanguageFlag } from "@/components/LanguageMenu";
import { LANGUAGES } from "@/locales";
import { setLanguage } from "@/i18n";
import { OnboardingScene, type SceneData } from "@/components/onboarding/OnboardingScene";
import { CountryFlag } from "@/components/CountryFlag";
import { isValidSiren } from "@/lib/siret";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { useAuth } from "@/components/AuthProvider";
import { useTranslation } from "react-i18next";

// Gate global : affiche l'onboarding pour TOUT utilisateur connecté (email OU
// Google OAuth) dont onboarding_completed n'est pas true. Monté une fois dans App.
export function OnboardingGate() {
  const { user, loading } = useAuth();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (loading || !user) { setShow(false); return; }
    let active = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("onboarding_completed")
          .eq("id", user.id)
          .maybeSingle();
        if (!active) return;
        // Fail-open : si la colonne n'existe pas encore (avant migration) ou erreur,
        // on n'impose pas l'onboarding pour ne bloquer personne.
        if (error) { setShow(false); return; }
        setShow(data?.onboarding_completed !== true);
      } catch {
        if (active) setShow(false);
      }
    })();
    return () => { active = false; };
  }, [user, loading]);

  if (!show) return null;
  return <OnboardingModal onDone={() => setShow(false)} />;
}

// Inscription : profil → entité → (repreneurs : leur projet de reprise, en trois écrans) → légal.
//
// Un repreneur ou un investisseur doit décrire son projet : c'est ce que compare
// le moteur de correspondance (src/lib/matching.ts). Sans ces réponses, aucune
// annonce ne peut lui être proposée sérieusement. Les trois écrans sont ceux du
// formulaire des Réglages (même composant, mêmes valeurs), où tout reste modifiable.
/** « Autre pays » : le membre habite hors des six pays de Globly ; aucun pays n'est alors enregistré. */
const OTHER_COUNTRY = "OTHER";
type StepKind = "language" | "profile" | "entity" | ProjectSection | "legal";
const PROJECT_STEPS: ProjectSection[] = ["what", "where", "means"];
const isProjectStep = (k: StepKind): k is ProjectSection => (PROJECT_STEPS as string[]).includes(k);

export function OnboardingModal({ onDone }: { onDone: () => void }) {
  const { t, i18n } = useTranslation();
  const { user, refreshUser } = useAuth();

  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [saving, setSaving] = useState(false);

  const [accountType, setAccountType] = useState<string>("");
  const [fullName, setFullName] = useState<string>(user?.user_metadata?.full_name || "");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState<string>(DEFAULT_COUNTRY);

  const [companyName, setCompanyName] = useState("");
  const [siren, setSiren] = useState("");
  const [legalForm, setLegalForm] = useState("");
  const [roleFunction, setRoleFunction] = useState("");

  const [project, setProject] = useState<BuyerProject>(emptyBuyerProject);

  const [acceptTerms, setAcceptTerms] = useState(false);
  const [certify, setCertify] = useState(false);

  const accountTypes = [
    { value: "repreneur", icon: Target, label: t("onb.type_buyer", "Repreneur"), desc: t("onb.type_buyer_desc", "Je cherche à reprendre une entreprise") },
    { value: "cedant", icon: Store, label: t("onb.type_seller", "Cédant"), desc: t("onb.type_seller_desc", "Je souhaite céder mon entreprise") },
    { value: "investisseur", icon: TrendingUp, label: t("onb.type_investor", "Investisseur"), desc: t("onb.type_investor_desc", "J'investis dans des sociétés") },
    { value: "conseil", icon: Handshake, label: t("onb.type_advisor", "Conseil"), desc: t("onb.type_advisor_desc", "J'accompagne des opérations (M&A, expert)") },
  ];

  // Toutes les listes viennent des référentiels partagés : aucune saisie libre
  // (hors nom, téléphone et raison sociale), pour que les données restent
  // filtrables et comparables d'un formulaire à l'autre.
  // Le numéro d'entreprise et les formes juridiques sont ceux du pays choisi à
  // la première étape (règles dans src/lib/markets.ts).
  const market = useMemo(() => marketOf(country), [country]);
  const isFrance = market.code === "FR";
  const companyIdName = market.code === "XX" ? (t("market.xx.id_name", market.identifier.name) as string) : market.identifier.name;
  const companyIdLooksWrong = !isFrance && siren.trim().length > 0 && !market.identifier.isValid(siren);
  // Un numéro d'entreprise est facultatif, mais s'il est rempli il doit être plausible :
  // en France, 9 chiffres avec la bonne clé de contrôle ; ailleurs, le format du pays.
  const sirenWrong = isFrance && siren.length === 9 && !isValidSiren(siren);
  const companyIdInvalid = siren.trim().length > 0 && (isFrance ? !isValidSiren(siren) : !market.identifier.isValid(siren));
  const legalForms = useMemo(() => market.legalForms.map((v) => ({ value: v, label: v })), [market]);
  // Changer de pays : le numéro repasse au format du pays, et une forme
  // juridique qui n'existe pas dans ce pays est retirée.
  const changeCountry = (code: string) => {
    setCountry(code);
    const nextMarket = marketOf(code);
    setSiren((v) => (nextMarket.code === "FR" ? v.replace(/\D/g, "").slice(0, 9) : nextMarket.identifier.clean(v)));
    setLegalForm((v) => (nextMarket.legalForms.includes(v) ? v : ""));
  };
  const countryChoices = useMemo(
    () => [
      ...marketCountryOptions(i18n.language).map((o) => ({ ...o, icon: <span className="text-[18px] leading-none"><CountryFlag code={o.value} /></span> })),
      { value: OTHER_COUNTRY, label: t("onb.country_other", "Autre pays") as string, icon: <span className="text-[18px] leading-none"><CountryFlag code="" /></span> },
    ],
    [i18n.language, t],
  );
  const roleOptions = useMemo(
    () => ROLE_FUNCTIONS.map((v) => ({ value: v, label: t(`onb.role_${v}`, ROLE_FUNCTION_LABELS[v]) as string })),
    [t]
  );
  // Le parcours dépend du type de compte : le projet de reprise n'est demandé qu'à ceux qui achètent.
  const isBuyer = accountType === "repreneur" || accountType === "investisseur";
  // La langue d'abord : tout le reste de l'inscription s'affiche ensuite dans la langue choisie.
  const flow: StepKind[] = ["language", "profile", "entity", ...(isBuyer ? PROJECT_STEPS : []), "legal"];
  const total = flow.length;
  const kind = flow[Math.min(step, total) - 1];

  const canNext = () => {
    if (kind === "profile") return accountType !== "" && fullName.trim().length >= 2 && country !== "";
    if (kind === "entity") return !companyIdInvalid;
    if (isProjectStep(kind)) return missingRequired(project, kind).length === 0;
    if (kind === "legal") return acceptTerms && certify;
    return true;
  };

  const next = () => {
    if (!canNext()) {
      showError(kind === "entity"
        ? t("onb.company_id_fix", "Le numéro de la société n'est pas valide. Corrigez-le ou laissez le champ vide.")
        : t("onb.fill_required", "Merci de remplir les champs obligatoires."));
      return;
    }
    setDirection(1);
    setStep((s) => Math.min(total, s + 1));
  };
  const prev = () => { setDirection(-1); setStep((s) => Math.max(1, s - 1)); };

  const finish = async () => {
    if (!canNext()) { showError(t("onb.accept_required", "Vous devez accepter les conditions pour continuer.")); return; }
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        // Pas de session (ex: confirmation email requise) -> on n'enregistre pas, on laisse entrer.
        showSuccess(t("onb.done", "Bienvenue sur Globly !"));
        onDone();
        return;
      }
      const uid = session.user.id;
      // Le projet de reprise, sous la même forme que dans les Réglages (chaîne vide = non renseigné).
      const saved = isBuyer ? serializeBuyerProject(project) : null;
      const projectRow = saved ? Object.fromEntries(Object.entries(saved).map(([k, v]) => [k, v || null])) : {};
      const profile = {
        id: uid,
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        country: country && country !== OTHER_COUNTRY ? country : null,
        account_type: accountType || null,
        company_name: companyName.trim() || null,
        // France : SIREN à 9 chiffres. Autres pays : le numéro du pays, nettoyé (même colonne).
        siren: (isFrance ? siren.trim() : market.identifier.clean(siren)) || null,
        legal_form: legalForm || null,
        role_function: roleFunction || null,
        ...projectRow,
        terms_accepted_at: new Date().toISOString(),
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      };
      // Métadonnées auth (cohérent avec la page Settings) + ligne profiles.
      await supabase.auth.updateUser({ data: {
        full_name: profile.full_name, phone: profile.phone, account_type: profile.account_type,
        ...(saved ? { target_sectors: saved.target_sectors, target_budget: saved.target_budget, target_geo: saved.target_geo } : {}),
      } });
      const { error } = await supabase.from("profiles").upsert(profile);
      if (error) throw error;
      await refreshUser();
      showSuccess(t("onb.done", "Bienvenue sur Globly !"));
      onDone();
    } catch (e) {
      console.error("onboarding save error:", e);
      // On ne piège jamais l'utilisateur : message clair puis accès à l'app.
      showError(t("onb.save_err", "Profil non enregistré (base à mettre à jour). Vous pourrez compléter dans Réglages."));
      onDone();
    } finally {
      setSaving(false);
    }
  };

  const labelClass = "text-[0.95rem] font-medium text-white mb-2 block";
  const inputClass = "w-full bg-white/[0.06] border border-white/15 rounded-2xl px-4 h-[52px] text-white placeholder:text-white/45 outline-none focus:border-[#a5a2ff] focus:bg-white/[0.09] transition-colors";
  const btnDropdown = "w-full flex items-center justify-between gap-3 bg-white/[0.06] border border-white/15 rounded-2xl px-4 h-[52px] text-white text-base hover:border-white/35 transition-colors";

  // Chaque écran a son illustration (public/inscription), son titre et une phrase d'accroche.
  const stepMeta: Record<StepKind, { art: string; title: string; tag: string }> = {
    language: { art: "langue", title: t("onb.lang_title", "Bienvenue sur Globly"), tag: t("onb.tag_language", "Dans quelle langue voulez-vous continuer ?") },
    profile: { art: "profil", title: t("onb.s1_title", "Votre profil"), tag: t("onb.tag_profile", "Faisons connaissance.") },
    entity: { art: "entite", title: t("onb.s2_title", "Votre entité"), tag: t("onb.tag_entity", "Votre société, si vous en avez une.") },
    what: { art: "recherche", title: t("onb.p_what_title", "Ce que vous cherchez"), tag: t("onb.tag_what", "Dites-nous ce qui vous fait envie.") },
    where: { art: "zone", title: t("onb.p_where_title", "Où, et quelle taille"), tag: t("onb.tag_where", "Montrez-nous votre terrain de jeu.") },
    means: { art: "moyens", title: t("onb.p_means_title", "Vos moyens et votre calendrier"), tag: t("onb.tag_means", "Vos moyens, pour ne voir que ce qui est à votre portée.") },
    legal: { art: "legal", title: t("onb.s4_title", "Informations légales"), tag: t("onb.tag_legal", "Un dernier accord, et c'est parti.") },
  };
  const meta = stepMeta[kind];
  // Ce que la scène de gauche affiche : les réponses déjà données, avec leurs libellés traduits.
  const industryLabel = (key: string) => t(`industry.${key}`, { defaultValue: key }) as string;
  const scene: SceneData = {
    language: i18n.language,
    fullName,
    accountType,
    accountLabel: accountTypes.find((a) => a.value === accountType)?.label ?? "",
    country: country === OTHER_COUNTRY ? "" : country,
    companyName,
    companyId: siren,
    legalForm,
    roleLabel: roleOptions.find((r) => r.value === roleFunction)?.label ?? "",
    project,
    sectorLabels: project.sectors.map(industryLabel),
    excludedLabels: project.excludedSectors.map(industryLabel),
    buyerRoleLabel: project.role ? (t(`bp.role_${project.role}`, BUYER_ROLE_DEFAULTS[project.role]) as string) : "",
    acceptTerms,
    certify,
  };
  // À chaque changement d'écran, on revient en haut (sinon, sur téléphone, l'écran suivant s'ouvrait au milieu).
  const pageRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    pageRef.current?.scrollTo({ top: 0 });
    formRef.current?.scrollTo({ top: 0 });
  }, [step]);
  const progress = total > 1 ? (step - 1) / (total - 1) : 1;

  return (
    <motion.div
      ref={pageRef}
      className="fixed inset-0 z-[300] overflow-y-auto bg-[#07070d]"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
    >
      <div className="min-h-full flex items-stretch lg:items-center justify-center sm:p-4 lg:p-8">
        <div className="relative w-full max-w-5xl grid grid-cols-1 lg:grid-cols-[0.92fr_1.2fr] overflow-hidden sm:rounded-[2rem] sm:border border-white/10 bg-[#16151d] text-white shadow-[0_40px_120px_rgba(0,0,0,0.6)]">

          {/* La scène : l'illustration de l'écran, son titre et le fil des étapes */}
          <aside className="relative overflow-hidden px-6 pt-6 pb-5 lg:p-10 flex flex-row lg:flex-col items-center lg:items-stretch gap-4 lg:gap-0 bg-[radial-gradient(120%_90%_at_20%_0%,#3d39c9_0%,#231f6b_45%,#14132b_100%)]">
            {/* Un fond uni et profond, avec une seule lueur douce : c'est la scène qui porte le mouvement */}
            <div aria-hidden="true" className="onb-drift-a absolute -left-20 -top-24 h-80 w-80 rounded-full bg-[#7a76ff]/45 blur-[100px]" />

            {/* Le nom du site, en lettres larges (police Unbounded, déjà servie par le site) */}
            <span className="relative z-10 hidden lg:block text-[1.35rem] leading-none tracking-[0.02em] text-white" style={{ fontFamily: "Unbounded, sans-serif", fontWeight: 600 }}>Globly</span>

            {/* Ordinateur : la scène de l'écran, construite avec les réponses. Téléphone : son illustration seule. */}
            <div className="relative hidden lg:block flex-1 min-h-[350px] my-6">
              <OnboardingScene kind={kind} data={scene} />
            </div>
            <img
              key={kind}
              src={`/inscription/${meta.art}.webp`} alt=""
              className="onb-float relative order-2 lg:hidden h-24 sm:h-28 w-auto shrink-0 drop-shadow-[0_18px_24px_rgba(0,0,0,0.45)] animate-in fade-in zoom-in-75 duration-500"
            />

            <div key={`t-${kind}`} className="relative z-10 order-1 lg:order-none flex-1 lg:flex-none min-w-0 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#cfccff]">{t("onb.step", "Étape")} {step}/{total}</p>
              <h2 className="mt-1.5 text-[clamp(1.5rem,2.4vw,2.2rem)] font-light leading-tight tracking-tight">{meta.title}</h2>
              <p className="mt-2 text-[0.95rem] lg:text-base text-white/85 leading-snug">{meta.tag}</p>
            </div>

            {/* L'avancement (ordinateur) : une simple barre qui se remplit */}
            <div className="relative hidden lg:block mt-6 h-1.5 rounded-full bg-white/15 overflow-hidden" aria-hidden="true">
              <div className="h-full rounded-full bg-white transition-[width] duration-700 ease-out" style={{ width: `${Math.max(4, (step / total) * 100)}%` }} />
            </div>
          </aside>

          {/* Le formulaire */}
          <section className="relative flex flex-col lg:max-h-[min(88vh,860px)]">
            {/* Avancement (téléphone et tablette) */}
            <div className="lg:hidden h-1.5 bg-white/10" aria-hidden="true">
              <div className="h-full rounded-r-full bg-gradient-to-r from-[#a5a2ff] to-[#34d399] transition-[width] duration-500" style={{ width: `${Math.max(6, progress * 100)}%` }} />
            </div>

            <div ref={formRef} className="flex-1 lg:overflow-y-auto px-6 py-7 lg:px-10 lg:py-9">
              <p className="text-white/80 text-[0.95rem] font-light mb-7 leading-relaxed">
                {isProjectStep(kind)
                  ? <>{t("onb.p_intro", "Vos réponses servent à vous proposer les annonces qui correspondent vraiment à votre projet. Vous pourrez les modifier dans les Réglages.")} {t("onb.p_required", "Les champs marqués d'une étoile sont obligatoires.")}</>
                  : kind === "language"
                    ? t("onb.lang_hint", "Vous pourrez changer de langue à tout moment depuis le menu du site.")
                    : t("onb.intro", "Quelques informations pour finaliser votre compte Globly et personnaliser votre expérience.")}
              </p>

              {/* Changement d'écran : une animation CSS, qui ne peut pas rester bloquée. */}
              <div
                key={step}
                className={`space-y-6 min-h-[280px] animate-in fade-in duration-300 ${direction > 0 ? "slide-in-from-right-4" : "slide-in-from-left-4"}`}
              >
            {kind === "language" && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {LANGUAGES.map((l) => {
                  const selected = i18n.language.slice(0, 2) === l.code;
                  return (
                    <button
                      key={l.code}
                      type="button"
                      lang={l.code}
                      aria-pressed={selected}
                      onClick={() => { void setLanguage(l.code); }}
                      className={`relative flex flex-col items-center gap-3 rounded-2xl border px-3 py-5 transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${selected ? "bg-[#5955e8]/25 border-[#a5a2ff] shadow-[0_12px_30px_rgba(89,85,232,0.35)] -translate-y-0.5" : "bg-white/[0.05] border-white/15 hover:border-white/40 hover:-translate-y-0.5"}`}
                    >
                      <LanguageFlag code={l.code} size={44} />
                      <span className="text-base font-medium text-white">{l.label}</span>
                      {selected && (
                        <span className="absolute right-2.5 top-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#34d399] text-[#063b2a] animate-in zoom-in-50 duration-200">
                          <Check className="h-3.5 w-3.5" strokeWidth={3} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {kind === "profile" && (
              <>
                <div>
                  <label className={labelClass}>{t("onb.account_type", "Vous êtes")} <span aria-hidden="true" className="text-[#fca5a5]">*</span></label>
                  <div className="grid grid-cols-2 gap-3">
                    {accountTypes.map((a) => {
                      const TypeIcon = a.icon;
                      const selected = accountType === a.value;
                      return (
                        <button
                          key={a.value}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => setAccountType(a.value)}
                          className={`group relative text-left p-4 rounded-2xl border transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${selected ? "bg-[#5955e8]/25 border-[#a5a2ff] shadow-[0_12px_30px_rgba(89,85,232,0.35)] -translate-y-0.5" : "bg-white/[0.05] border-white/15 hover:border-white/40 hover:-translate-y-0.5"}`}
                        >
                          <span className={`flex h-11 w-11 items-center justify-center rounded-xl mb-3 transition-colors ${selected ? "bg-[#5955e8] text-white" : "bg-white/10 text-[#cfccff]"}`}>
                            <TypeIcon className="h-5 w-5" />
                          </span>
                          <span className="block text-base font-medium text-white">{a.label}</span>
                          <span className="block text-[13px] text-white/75 leading-snug mt-1">{a.desc}</span>
                          {selected && (
                            <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-[#34d399] text-[#063b2a] animate-in zoom-in-50 duration-200">
                              <Check className="h-3.5 w-3.5" strokeWidth={3} />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label className={labelClass}>{t("onb.full_name", "Nom complet")} *</label>
                  <input value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} placeholder="Jean Dupont" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>{t("onb.phone", "Téléphone")}</label>
                    <input type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^\d+ ().-]/g, "").slice(0, 20))} className={inputClass} placeholder={isFrance ? "+33 6 12 34 56 78" : market.phonePrefix ? `${market.phonePrefix} …` : "+…"} />
                    {/* « Autre pays » : pas d'indicatif connu, on dit quoi écrire */}
                    {country === OTHER_COUNTRY && (
                      <p className="text-white/75 text-[13px] font-light mt-2 leading-snug">{t("onb.phone_other_hint", "Commencez par l'indicatif de votre pays, par exemple +32 pour la Belgique.")}</p>
                    )}
                  </div>
                  <div>
                    <label className={labelClass}>{t("onb.country", "Pays")} *</label>
                    {/* Les six pays où Globly est ouvert, et « Autre pays » pour qui habite ailleurs */}
                    <Dropdown value={country} onChange={changeCountry} options={countryChoices}
                      placeholder={t("onb.select", "Sélectionnez…") as string} buttonClassName={btnDropdown} />
                  </div>
                </div>
              </>
            )}

            {kind === "entity" && (
              <>
                <p className="text-white/80 text-sm font-light -mt-1">{t("onb.s2_hint", "Si vous représentez une société. Facultatif pour un particulier.")}</p>
                <div>
                  <label className={labelClass}>{t("onb.company_name", "Raison sociale")}</label>
                  <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className={inputClass} placeholder="Globly SAS" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>{isFrance ? t("onb.siren", "SIREN") : companyIdName}</label>
                    {isFrance ? (
                      <input value={siren} onChange={(e) => setSiren(e.target.value.replace(/\D/g, "").slice(0, 9))} className={inputClass} placeholder="9 chiffres, ex: 394 927 081" inputMode="numeric" />
                    ) : (
                      <input value={siren} onChange={(e) => setSiren(e.target.value.toUpperCase().replace(/[^A-Z0-9 .\-/]/g, "").slice(0, 30))} className={inputClass} placeholder={market.identifier.placeholder} autoComplete="off" spellCheck={false} />
                    )}
                    <p className="text-white/75 text-[13px] font-light mt-2 leading-snug">
                      {isFrance
                        ? t("onb.siren_hint", "SIREN = 9 chiffres (votre société). À ne pas confondre avec le SIRET (14 chiffres) qui désigne un établissement précis.")
                        : t(`market.${market.code.toLowerCase()}.id_what`, market.identifier.what)}
                      {isFrance && siren.length > 0 && siren.length < 9 && <span className="text-[#fca5a5]"> · {t("onb.siren_incomplete", "il manque {{n}} chiffre(s)", { n: 9 - siren.length })}</span>}
                      {sirenWrong && <span className="text-[#fca5a5]"> · {t("onb.siren_invalid", "ce numéro n'existe pas : vérifiez les chiffres")}</span>}
                      {companyIdLooksWrong && <span className="text-[#fca5a5]"> · {t("onb.company_id_check", "ce numéro ne ressemble pas au format habituel, vérifiez-le")}</span>}
                    </p>
                  </div>
                  <div>
                    <label className={labelClass}>{t("onb.legal_form", "Forme juridique")}</label>
                    {legalForms.length > 0 ? (
                      <Dropdown value={legalForm} onChange={setLegalForm} options={legalForms} placeholder={t("onb.select", "Sélectionnez…")} buttonClassName={btnDropdown} />
                    ) : (
                      <input value={legalForm} onChange={(e) => setLegalForm(e.target.value.slice(0, 60))} className={inputClass} placeholder={t("onb.legal_form_free", "Ex. : société à responsabilité limitée") as string} />
                    )}
                  </div>
                </div>
                <div>
                  <label className={labelClass}>{t("onb.role", "Votre fonction")}</label>
                  <Dropdown value={roleFunction} onChange={setRoleFunction} options={roleOptions}
                    placeholder={t("onb.select", "Sélectionnez…") as string} buttonClassName={btnDropdown} />
                </div>
              </>
            )}

            {isProjectStep(kind) && (
              <BuyerProjectForm value={project} onChange={setProject} sections={[kind]} required={REQUIRED_FIELDS[kind]} compact />
            )}

            {kind === "legal" && (
              <>
                <p className="text-white/85 text-[0.95rem] font-light">{t("onb.s4_hint", "Dernière étape : merci de confirmer les éléments légaux ci-dessous.")}</p>
                <label className="flex items-start gap-3 p-4 rounded-2xl bg-white/[0.06] border border-white/15 cursor-pointer hover:border-white/35 transition-colors">
                  <input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} className="mt-0.5 accent-primary w-5 h-5 shrink-0" />
                  <span className="text-[0.95rem] text-white/90 font-light leading-relaxed">{t("onb.accept_terms", "J'accepte les Conditions Générales d'Utilisation et la Politique de Confidentialité de Globly.")} *</span>
                </label>
                <label className="flex items-start gap-3 p-4 rounded-2xl bg-white/[0.06] border border-white/15 cursor-pointer hover:border-white/35 transition-colors">
                  <input type="checkbox" checked={certify} onChange={(e) => setCertify(e.target.checked)} className="mt-0.5 accent-primary w-5 h-5 shrink-0" />
                  <span className="text-[0.95rem] text-white/90 font-light leading-relaxed">{t("onb.certify", "Je certifie sur l'honneur l'exactitude des informations fournies.")} *</span>
                </label>
                <p className="text-white/75 text-[13px] font-light leading-relaxed">{t("onb.legal_note", "Globly agit comme facilitateur technologique et ne prend pas part au transfert légal des actifs ou des fonds.")}</p>
              </>
            )}
              </div>
            </div>

            <footer className="sticky bottom-0 flex items-center justify-between gap-3 px-6 lg:px-10 py-4 border-t border-white/10 bg-[#16151d]/95 backdrop-blur">
              {step > 1 ? (
                <Button onClick={prev} className="h-12 px-4 rounded-full bg-white/[0.07] hover:bg-white/15 border border-white/15 text-white">
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden sm:inline ml-1">{t("onb.back", "Retour")}</span>
                </Button>
              ) : <span />}
              {step < total ? (
                <Button onClick={next} className="h-12 px-7 rounded-full bg-primary hover:bg-primary/90 text-white font-medium shadow-[0_10px_26px_rgba(89,85,232,0.45)]">
                  {t("onb.next", "Continuer")} <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button onClick={finish} disabled={saving} className="h-12 px-7 rounded-full bg-primary hover:bg-primary/90 text-white font-medium shadow-[0_10px_26px_rgba(89,85,232,0.45)] disabled:opacity-50">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <>{t("onb.finish", "Accéder à Globly")} <Check className="w-4 h-4 ml-1" /></>}
                </Button>
              )}
            </footer>
          </section>
        </div>
      </div>
    </motion.div>
  );
}
