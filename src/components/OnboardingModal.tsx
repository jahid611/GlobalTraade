"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ChevronRight, ChevronLeft, Check, Building2, Target, ShieldCheck, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dropdown } from "@/components/PickerKit";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { useAuth } from "@/components/AuthProvider";
import { useTranslation } from "react-i18next";

// Parse un montant écrit librement (450k, 450 000, 1,5M, 450000€) en nombre.
function parseAmount(raw: string): number | null {
  let s = (raw || "").toLowerCase().replace(/[€\s  ]/g, "").replace(",", ".");
  let mult = 1;
  if (s.endsWith("k")) { mult = 1_000; s = s.slice(0, -1); }
  else if (s.endsWith("m")) { mult = 1_000_000; s = s.slice(0, -1); }
  if (!/^\d*\.?\d+$/.test(s)) return null;
  const n = parseFloat(s);
  return isNaN(n) ? null : Math.round(n * mult);
}

// Uniformise un budget (simple ou fourchette) en "450 000 €" / "100 000 € – 5 000 000 €".
function normalizeBudget(input: string): string {
  const v = (input || "").trim();
  if (!v) return "";
  const parts = v.split(/\s*(?:-|–|—|à|to)\s*/i).filter(Boolean);
  const out = parts.map((p) => {
    const n = parseAmount(p);
    return n == null ? null : n.toLocaleString("fr-FR").replace(/[  ]/g, " ") + " €";
  });
  if (out.some((x) => x == null)) return v; // illisible -> on laisse tel quel
  return out.join(" – ");
}

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

// Onboarding légal (inspiré du parcours Bpifrance) : profil → entité → objectifs → légal.
export function OnboardingModal({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation();
  const { user, refreshUser } = useAuth();

  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [saving, setSaving] = useState(false);

  const [accountType, setAccountType] = useState<string>("");
  const [fullName, setFullName] = useState<string>(user?.user_metadata?.full_name || "");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("France");

  const [companyName, setCompanyName] = useState("");
  const [siren, setSiren] = useState("");
  const [legalForm, setLegalForm] = useState("");
  const [roleFunction, setRoleFunction] = useState("");

  const [targetSectors, setTargetSectors] = useState("");
  const [targetBudget, setTargetBudget] = useState("");
  const [targetGeo, setTargetGeo] = useState("");

  const [acceptTerms, setAcceptTerms] = useState(false);
  const [certify, setCertify] = useState(false);

  const accountTypes = [
    { value: "repreneur", label: t("onb.type_buyer", "Repreneur"), desc: t("onb.type_buyer_desc", "Je cherche à reprendre une entreprise") },
    { value: "cedant", label: t("onb.type_seller", "Cédant"), desc: t("onb.type_seller_desc", "Je souhaite céder mon entreprise") },
    { value: "investisseur", label: t("onb.type_investor", "Investisseur"), desc: t("onb.type_investor_desc", "J'investis dans des sociétés") },
    { value: "conseil", label: t("onb.type_advisor", "Conseil"), desc: t("onb.type_advisor_desc", "J'accompagne des opérations (M&A, expert)") },
  ];

  const legalForms = useMemo(
    () => ["SAS", "SASU", "SARL", "EURL", "SA", "SNC", "EI", "Micro-entreprise", t("onb.legal_other", "Autre")].map((v) => ({ value: v, label: v })),
    [t]
  );

  const canNext = () => {
    if (step === 1) return accountType !== "" && fullName.trim().length >= 2 && country.trim().length >= 2;
    if (step === 4) return acceptTerms && certify;
    return true;
  };

  const next = () => {
    if (!canNext()) {
      showError(t("onb.fill_required", "Merci de remplir les champs obligatoires."));
      return;
    }
    setDirection(1);
    setStep((s) => Math.min(4, s + 1));
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
      const profile = {
        id: uid,
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        country: country.trim() || null,
        account_type: accountType || null,
        company_name: companyName.trim() || null,
        siren: siren.trim() || null,
        legal_form: legalForm || null,
        role_function: roleFunction.trim() || null,
        target_sectors: targetSectors.trim() || null,
        target_budget: targetBudget.trim() || null,
        target_geo: targetGeo.trim() || null,
        terms_accepted_at: new Date().toISOString(),
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      };
      // Métadonnées auth (cohérent avec la page Settings) + ligne profiles.
      await supabase.auth.updateUser({ data: { full_name: profile.full_name, phone: profile.phone, account_type: profile.account_type } });
      const { error } = await supabase.from("profiles").upsert(profile);
      if (error) throw error;
      await refreshUser();
      showSuccess(t("onb.done", "Bienvenue sur Globly !"));
      onDone();
    } catch (e: any) {
      console.error("onboarding save error:", e);
      // On ne piège jamais l'utilisateur : message clair puis accès à l'app.
      showError(t("onb.save_err", "Profil non enregistré (base à mettre à jour). Vous pourrez compléter dans Réglages."));
      onDone();
    } finally {
      setSaving(false);
    }
  };

  const labelClass = "text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] text-white/60 mb-2 block";
  const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl px-4 h-12 text-white outline-none focus:border-primary/50 transition-colors";
  const btnDropdown = "w-full flex items-center justify-between gap-3 bg-white/5 border border-white/10 rounded-xl px-4 h-12 text-white text-base font-light hover:border-white/30 transition-colors";

  const stepMeta = [
    { icon: UserRound, title: t("onb.s1_title", "Votre profil") },
    { icon: Building2, title: t("onb.s2_title", "Votre entité") },
    { icon: Target, title: t("onb.s3_title", "Vos objectifs") },
    { icon: ShieldCheck, title: t("onb.s4_title", "Informations légales") },
  ];
  const Icon = stepMeta[step - 1].icon;

  return (
    <motion.div
      className="fixed inset-0 z-[300] flex items-start md:items-center justify-center p-3 md:p-4 bg-black/80 backdrop-blur-md overflow-y-auto"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
    >
      <motion.div
        className="liquid-glass-heavy rounded-[1.75rem] md:rounded-[2rem] p-6 md:p-9 border border-white/10 w-full max-w-xl my-4 md:my-8 text-white"
        initial={{ scale: 0.96, y: 20 }} animate={{ scale: 1, y: 0 }}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-widest text-white/40">{t("onb.step", "Étape")} {step}/4</p>
            <h2 className="text-xl sm:text-2xl font-light tracking-tight">{stepMeta[step - 1].title}</h2>
          </div>
        </div>
        <p className="text-white/50 text-sm font-light mb-6 leading-relaxed">
          {t("onb.intro", "Quelques informations pour finaliser votre compte Globly et personnaliser votre expérience.")}
        </p>

        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            initial={{ x: direction > 0 ? 30 : -30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: direction < 0 ? 30 : -30, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="space-y-5 min-h-[260px]"
          >
            {step === 1 && (
              <>
                <div>
                  <label className={labelClass}>{t("onb.account_type", "Vous êtes")} *</label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {accountTypes.map((a) => (
                      <button
                        key={a.value}
                        type="button"
                        onClick={() => setAccountType(a.value)}
                        className={`text-left p-3 rounded-xl border transition-all ${accountType === a.value ? "bg-primary/15 border-primary/50" : "bg-white/5 border-white/10 hover:border-white/30"}`}
                      >
                        <div className="text-sm font-medium">{a.label}</div>
                        <div className="text-[11px] text-white/40 font-light leading-snug mt-0.5">{a.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className={labelClass}>{t("onb.full_name", "Nom complet")} *</label>
                  <input value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} placeholder="Jean Dupont" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>{t("onb.phone", "Téléphone")}</label>
                    <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} placeholder="+33 6 12 34 56 78" />
                  </div>
                  <div>
                    <label className={labelClass}>{t("onb.country", "Pays")} *</label>
                    <input value={country} onChange={(e) => setCountry(e.target.value)} className={inputClass} placeholder="France" />
                  </div>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <p className="text-white/40 text-xs font-light -mt-1">{t("onb.s2_hint", "Si vous représentez une société. Facultatif pour un particulier.")}</p>
                <div>
                  <label className={labelClass}>{t("onb.company_name", "Raison sociale")}</label>
                  <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className={inputClass} placeholder="Globly SAS" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>{t("onb.siren", "SIREN")}</label>
                    <input value={siren} onChange={(e) => setSiren(e.target.value.replace(/\D/g, "").slice(0, 9))} className={inputClass} placeholder="9 chiffres — ex: 394 927 081" inputMode="numeric" />
                    <p className="text-white/30 text-[11px] font-light mt-1.5">
                      {t("onb.siren_hint", "SIREN = 9 chiffres (votre société). À ne pas confondre avec le SIRET (14 chiffres) qui désigne un établissement précis.")}
                      {siren.length > 0 && siren.length < 9 && <span className="text-[#fca5a5]"> · {t("onb.siren_incomplete", "il manque {{n}} chiffre(s)", { n: 9 - siren.length })}</span>}
                    </p>
                  </div>
                  <div>
                    <label className={labelClass}>{t("onb.legal_form", "Forme juridique")}</label>
                    <Dropdown value={legalForm} onChange={setLegalForm} options={legalForms} placeholder={t("onb.select", "Sélectionnez…")} buttonClassName={btnDropdown} />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>{t("onb.role", "Votre fonction")}</label>
                  <input value={roleFunction} onChange={(e) => setRoleFunction(e.target.value)} className={inputClass} placeholder={t("onb.role_ph", "Dirigeant, Associé, Directeur M&A…")} />
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <p className="text-white/40 text-xs font-light -mt-1">{t("onb.s3_hint", "Pour des recommandations pertinentes. Vous pourrez les affiner dans Réglages.")}</p>
                <div>
                  <label className={labelClass}>{t("onb.sectors", "Secteurs visés")}</label>
                  <input value={targetSectors} onChange={(e) => setTargetSectors(e.target.value)} className={inputClass} placeholder="ex: Tech, SaaS, E-commerce, Restauration" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>{t("onb.budget", "Budget")}</label>
                    <input
                      value={targetBudget}
                      onChange={(e) => setTargetBudget(e.target.value)}
                      onBlur={() => setTargetBudget(normalizeBudget(targetBudget))}
                      className={inputClass}
                      placeholder="ex: 450 000 €"
                      inputMode="text"
                    />
                    <p className="text-white/30 text-[11px] font-light mt-1.5">{t("onb.budget_hint", "Écris comme tu veux (450k, 450000, 100k - 5M…), le montant est mis au format automatiquement.")}</p>
                  </div>
                  <div>
                    <label className={labelClass}>{t("onb.geo", "Zone géographique")}</label>
                    <input value={targetGeo} onChange={(e) => setTargetGeo(e.target.value)} className={inputClass} placeholder="ex: Île-de-France, Europe" />
                  </div>
                </div>
              </>
            )}

            {step === 4 && (
              <>
                <p className="text-white/50 text-sm font-light">{t("onb.s4_hint", "Dernière étape : merci de confirmer les éléments légaux ci-dessous.")}</p>
                <label className="flex items-start gap-3 p-4 rounded-xl bg-white/5 border border-white/10 cursor-pointer">
                  <input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} className="mt-0.5 accent-primary w-4 h-4 shrink-0" />
                  <span className="text-sm text-white/80 font-light leading-relaxed">{t("onb.accept_terms", "J'accepte les Conditions Générales d'Utilisation et la Politique de Confidentialité de Globly.")} *</span>
                </label>
                <label className="flex items-start gap-3 p-4 rounded-xl bg-white/5 border border-white/10 cursor-pointer">
                  <input type="checkbox" checked={certify} onChange={(e) => setCertify(e.target.checked)} className="mt-0.5 accent-primary w-4 h-4 shrink-0" />
                  <span className="text-sm text-white/80 font-light leading-relaxed">{t("onb.certify", "Je certifie sur l'honneur l'exactitude des informations fournies.")} *</span>
                </label>
                <p className="text-white/30 text-xs font-light leading-relaxed">{t("onb.legal_note", "Globly agit comme facilitateur technologique et ne prend pas part au transfert légal des actifs ou des fonds.")}</p>
              </>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center justify-between gap-3 mt-7">
          <div className="flex gap-1.5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${step === i ? "w-7 bg-primary" : "w-1.5 bg-white/20"}`} />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {step > 1 && (
              <Button onClick={prev} className="h-11 px-4 rounded-full bg-white/5 hover:bg-white/10 text-white">
                <ChevronLeft className="w-4 h-4" />
              </Button>
            )}
            {step < 4 ? (
              <Button onClick={next} className="h-11 px-6 rounded-full bg-primary hover:bg-primary/90 text-white font-medium">
                {t("onb.next", "Continuer")} <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={finish} disabled={saving} className="h-11 px-6 rounded-full bg-primary hover:bg-primary/90 text-white font-medium disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <>{t("onb.finish", "Accéder à Globly")} <Check className="w-4 h-4 ml-1" /></>}
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
