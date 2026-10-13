"use client";

import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Mail, Search, Send, Copy, RefreshCw, Inbox, Lock } from "lucide-react";
import { showError, showSuccess } from "@/utils/toast";
// Messages d'information (ni succès ni erreur) : `toast` de sonner en direct.
import { toast } from "sonner";
import { startCheckout, openCheckout } from "@/services/stripe";
import { EXTRA_PROSPECT_PRICE } from "@/services/planService";
import {
  buildOutreachEmail, updateProspect, sendProspectEmail, getProspectionQuota, registerProspectionContact,
  isProspectAlreadyCounted, PROSPECTION_MONTHLY_INCLUDED, type Prospect, type ProspectionQuota,
} from "@/services/prospectService";
import { addActivities, getProspect, patchProspect, type NewActivity } from "@/services/crmService";
import { isValidEmail, statusAfterContact } from "@/lib/crm";
import { areaCls, fieldCls, ghostBtnCls, labelCls, primaryBtnCls } from "./crmMeta";

interface EmailComposerProps {
  prospect: Prospect;
  senderName: string;
  userId: string;
  /** formule Business confirmée : l'envoi (serveur ou messagerie) lui est réservé */
  isBusiness: boolean;
  quota: ProspectionQuota | null;
  /** la fiche, l'historique ou le quota ont changé : à recharger */
  onChanged: () => void;
  /** paiement d'un contact au-delà du forfait (Stripe intégré) */
  onPayExtra: (clientSecret: string) => void;
}

export function EmailComposer({ prospect, senderName, userId, isBusiness, quota, onChanged, onPayExtra }: EmailComposerProps) {
  const { t, i18n } = useTranslation();
  // Langue de l'email mémorisée EN BASE (prospect.mail_lang) ; sinon langue du site.
  const initialLang: "fr" | "en" =
    prospect.mail_lang === "en" || prospect.mail_lang === "fr"
      ? prospect.mail_lang
      : (i18n.language?.startsWith("en") ? "en" : "fr");
  const [mailLang, setMailLang] = useState<"fr" | "en">(initialLang);
  const [email, setEmail] = useState(prospect.email || "");
  const initial = buildOutreachEmail(prospect, senderName, initialLang);
  const [subject, setSubject] = useState(initial.subject);
  const [body, setBody] = useState(initial.body);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [opening, setOpening] = useState(false);

  // L'email peut aussi être modifié dans l'onglet « Fiche ».
  useEffect(() => { setEmail(prospect.email || ""); }, [prospect.email]);

  const businessOnly = t("quota.prospection_business", "La prospection ciblée (envoi de campagnes) est réservée à la formule Business.") as string;
  const extraOne = t("quota.prospection_extra_one",
    `Votre forfait de ${PROSPECTION_MONTHLY_INCLUDED} entreprises contactées ce mois-ci est atteint. Ce contact supplémentaire coûte ${EXTRA_PROSPECT_PRICE} €, réglez-le, puis relancez l'envoi.`) as string;

  // Change la langue de CE mail uniquement — n'affecte pas la langue du site.
  const applyMailLang = (lang: "fr" | "en") => {
    if (lang === mailLang) return;
    setMailLang(lang);
    const m = buildOutreachEmail(prospect, senderName, lang);
    setSubject(m.subject);
    setBody(m.body);
  };

  const regenerate = () => {
    const m = buildOutreachEmail(prospect, senderName, mailLang);
    setSubject(m.subject);
    setBody(m.body);
    showSuccess(t("crm.mail.regenerated", "Message régénéré"));
  };

  /** Adresse saisie, vérifiée ; null (avec message) si elle manque ou n'est pas valable. */
  const checkedEmail = (): string | null => {
    const v = email.trim();
    if (!v) { showError(t("crm.mail.email_required", "Renseigne d'abord l'email du dirigeant")); return null; }
    if (!isValidEmail(v)) { showError(t("crm.field.email_invalid", "Cette adresse email n'est pas valable.")); return null; }
    return v;
  };

  const save = async () => {
    const v = email.trim();
    if (v && !isValidEmail(v)) { showError(t("crm.field.email_invalid", "Cette adresse email n'est pas valable.")); return; }
    setSaving(true);
    try {
      await updateProspect(prospect.id, { email: v || null, mail_lang: mailLang });
      showSuccess(t("crm.mail.saved", "Enregistré"));
      onChanged();
    } catch (e) {
      // Repli si la colonne mail_lang n'existe pas encore : on sauvegarde au moins l'email.
      if (/mail_lang|column|schema cache|could not find/i.test(String((e as { message?: string })?.message || ""))) {
        try {
          await updateProspect(prospect.id, { email: v || null });
          showSuccess(t("crm.mail.saved", "Enregistré"));
          onChanged();
          return;
        } catch { /* message d'erreur ci-dessous */ }
      }
      showError(t("crm.mail.save_err", "Erreur d'enregistrement"));
    } finally {
      setSaving(false);
    }
  };

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(`${subject}\n\n${body}`);
      showSuccess(t("crm.mail.copied", "Message copié"));
    } catch {
      showError(t("crm.mail.copy_err", "Copie impossible"));
    }
  };

  /** Inscrit l'email parti dans l'historique, avec le changement d'étape s'il y en a eu un. */
  const logEmail = async (to: string, channel: "server" | "mailbox", statusNow: Prospect["status"]) => {
    const rows: NewActivity[] = [
      { prospect_id: prospect.id, type: "email", content: subject, metadata: { to, channel, lang: mailLang } },
    ];
    if (statusNow !== prospect.status) {
      rows.push({ prospect_id: prospect.id, type: "status", metadata: { from: prospect.status, to: statusNow } });
    }
    await addActivities(rows);
  };

  // Envoi direct depuis Globly (Business) : l'email part du serveur, le membre
  // est en reply_to. Le quota et le paiement sont vérifiés côté serveur.
  const sendDirect = async () => {
    const to = checkedEmail();
    if (!to) return;
    setSending(true);
    // On enregistre l'email saisi avant d'envoyer : le serveur lit le prospect en base.
    try { await updateProspect(prospect.id, { email: to }); } catch { /* noop */ }
    const r = await sendProspectEmail(prospect.id, subject, body, mailLang);

    if (r.ok) {
      // L'email est parti. Le serveur a pu faire avancer l'étape : on relit la fiche.
      try {
        const fresh = await getProspect(prospect.id);
        await patchProspect(prospect.id, { last_contacted_at: new Date().toISOString() });
        await logEmail(to, "server", fresh?.status || prospect.status);
      } catch { /* l'historique est secondaire : l'email est bien parti */ }
      setSending(false);
      showSuccess(t("crm.mail.sent", "Email envoyé, prospect marqué « Contacté »"));
      onChanged();
      return;
    }
    setSending(false);
    if (r.paymentRequired) {
      const c = await startCheckout({
        kind: "prospection",
        target: { type: "prospection", id: prospect.siren, name: prospect.nom },
        returnPath: "/radar?success=1",
      });
      const payFirst = r.error || extraOne;
      if (c.ok && c.url) { await openCheckout(c.url); toast.info(payFirst); return; }
      if (c.ok && c.clientSecret) { onPayExtra(c.clientSecret); toast.info(payFirst); return; }
    }
    showError(r.notConfigured
      ? t("crm.mail.send_soon", "L'envoi automatique sera bientôt disponible.")
      : (r.error || t("msg.error", "Une erreur est survenue.")));
  };

  // Ouvre la messagerie de l'utilisateur (Gmail/Outlook/Mail) pré-remplie, puis marque « Contacté ».
  const sendViaMailbox = async () => {
    if (!isBusiness) { showError(businessOnly); return; }
    const to = checkedEmail();
    if (!to) return;
    setOpening(true);
    try {
      // Quota Business : 20 entreprises contactées / mois, puis 2 € chacune.
      // Au-delà du forfait, le contact doit être PAYÉ avant d'être utilisable :
      // c'est le webhook Stripe qui l'enregistre (la RLS interdit au client
      // d'écrire une ligne facturée).
      if (userId && !(await isProspectAlreadyCounted(userId, prospect.siren))) {
        const q = await getProspectionQuota(userId);
        if (q.extra) {
          const r = await startCheckout({
            kind: "prospection",
            target: { type: "prospection", id: prospect.siren, name: prospect.nom },
            returnPath: "/radar?success=1",
          });
          if (r.ok && (r.clientSecret || r.url)) {
            if (r.url) await openCheckout(r.url);
            else onPayExtra(r.clientSecret!);
            toast.info(extraOne);
          } else {
            showError(r.error || t("msg.error", "Une erreur est survenue."));
          }
          return;
        }
        try {
          await registerProspectionContact(userId, prospect.siren, prospect.nom);
        } catch {
          showError(extraOne);
          return;
        }
      }

      window.location.href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      try {
        const nextStatus = statusAfterContact(prospect.status);
        await patchProspect(prospect.id, { email: to, status: nextStatus, last_contacted_at: new Date().toISOString() });
        try { await logEmail(to, "mailbox", nextStatus); } catch { /* l'historique est secondaire */ }
        showSuccess(t("crm.mail.opened", "Ouvert dans ta messagerie, marqué « Contacté »"));
      } catch {
        showError(t("crm.mail.opened_err", "Email ouvert, mais maj statut échouée"));
      }
      onChanged();
    } finally {
      setOpening(false);
    }
  };

  const findEmail = `https://www.google.com/search?q=${encodeURIComponent(prospect.nom + " " + (prospect.ville || "") + " email contact")}`;
  const hasEmail = !!email.trim();

  return (
    <div className="space-y-5">
      {!isBusiness && (
        <p className="flex items-start gap-2.5 rounded-xl bg-primary/15 border border-primary/40 px-3.5 py-3 text-sm text-white/85">
          <Lock size={15} className="shrink-0 mt-0.5" aria-hidden />
          <span>{t("crm.mail.business_note", "Tu peux préparer et copier ton message. L'envoi (depuis Globly ou ta messagerie) est réservé à la formule Business.")}</span>
        </p>
      )}

      <div>
        <label htmlFor="crm-mail-to" className={`${labelCls} flex items-center gap-2`}><Mail size={13} aria-hidden /> {t("crm.mail.director_email", "Email du dirigeant")}</label>
        <div className="flex gap-2">
          <input
            id="crm-mail-to"
            type="email"
            inputMode="email"
            autoComplete="off"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("crm.mail.email_ph", "contact@entreprise.fr") as string}
            className={`${fieldCls} flex-1 min-w-0`}
          />
          <a href={findEmail} target="_blank" rel="noreferrer" className={`${ghostBtnCls} shrink-0`} title={t("crm.mail.find_tip", "Chercher l'email sur le web") as string}>
            <Search size={15} /> {t("crm.mail.find", "Trouver")}
          </a>
        </div>
        <p className="text-white/50 text-xs mt-1.5 leading-relaxed">{t("crm.mail.find_hint", "Sirene ne fournit pas l'email, trouve-le via « Trouver » (site web de la boîte) et colle-le ici.")}</p>
      </div>

      {/* --- Message de prise de contact --- */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
          <label htmlFor="crm-mail-subject" className="text-xs font-medium text-white/60 flex items-center gap-2"><Send size={13} aria-hidden /> {t("crm.mail.message", "Message de contact")}</label>
          <div className="flex items-center gap-1">
            {/* Langue de l'email — indépendante de la langue du site */}
            <div role="group" aria-label={t("crm.mail.lang_tip", "Langue de cet email (n'affecte pas la langue du site)") as string} title={t("crm.mail.lang_tip", "Langue de cet email (n'affecte pas la langue du site)") as string} className="flex items-center p-1 rounded-full bg-white/5 border border-white/10">
              {(["fr", "en"] as const).map((lng) => (
                <button
                  key={lng}
                  type="button"
                  onClick={() => applyMailLang(lng)}
                  aria-pressed={mailLang === lng}
                  className={`min-w-[44px] h-9 px-3 rounded-full text-xs font-medium uppercase transition-colors ${mailLang === lng ? "bg-primary text-white" : "text-white/60 hover:text-white"}`}
                >
                  {lng}
                </button>
              ))}
            </div>
            <button type="button" onClick={regenerate} className="inline-flex items-center gap-1.5 h-11 px-2.5 rounded-xl text-xs text-white/65 hover:text-white hover:bg-white/10 transition-colors">
              <RefreshCw size={13} /> {t("crm.mail.regen", "Régénérer")}
            </button>
          </div>
        </div>
        <input
          id="crm-mail-subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder={t("crm.mail.subject_ph", "Objet") as string}
          aria-label={t("crm.mail.subject_ph", "Objet") as string}
          className={`${fieldCls} mb-2`}
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={11}
          aria-label={t("crm.mail.message", "Message de contact") as string}
          className={areaCls}
        />
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={sendDirect} disabled={!hasEmail || sending || !isBusiness} className={`${primaryBtnCls} flex-1 min-w-[200px]`}>
            {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            {t("crm.mail.send_now", "Envoyer maintenant")}
          </button>
          <button type="button" onClick={copyMessage} className={ghostBtnCls} title={t("crm.mail.copy", "Copier le message") as string}>
            <Copy size={15} /> {t("crm.mail.copy_short", "Copier")}
          </button>
        </div>
        <button
          type="button"
          onClick={sendViaMailbox}
          disabled={!hasEmail || !isBusiness || opening}
          title={!isBusiness ? businessOnly : undefined}
          className={`${ghostBtnCls} w-full`}
        >
          {opening ? <Loader2 size={15} className="animate-spin" /> : <Inbox size={15} />}
          {t("crm.mail.open_mailbox", "Ouvrir dans ma messagerie")}
        </button>
        {isBusiness && quota && (
          <p className="text-xs text-white/55 leading-relaxed">
            {t("crm.mail.quota", { used: quota.used, included: quota.included, defaultValue: "{{used}} / {{included}} contacts ce mois." })}{" "}
            {quota.extra
              ? t("crm.mail.quota_extra", { price: EXTRA_PROSPECT_PRICE, defaultValue: "Forfait atteint : un nouveau contact coûte {{price}} €." })
              : t("crm.mail.quota_hint", "Une entreprise déjà contactée ce mois-ci ne recompte pas.")}
          </p>
        )}
      </div>

      <div className="flex justify-end pt-1 border-t border-white/10">
        <button type="button" onClick={save} disabled={saving} className={`${ghostBtnCls} mt-3`}>
          {saving ? <Loader2 size={15} className="animate-spin" /> : null}
          {t("crm.mail.save_email", "Enregistrer l'email et la langue")}
        </button>
      </div>
    </div>
  );
}
