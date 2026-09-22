"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { showError, showSuccess } from '@/utils/toast';
import { useTranslation } from 'react-i18next';
import { Loader2, ShieldCheck, Trash2 } from 'lucide-react';

// Double authentification (TOTP) — Supabase Auth MFA.
// Volontairement court et explicite : la cible de Globly n'est pas technique.
// Trois états seulement : pas activée / en cours d'activation / activée.

type Factor = { id: string; friendly_name?: string | null; status: string };

export function TwoFactorSettings() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [factor, setFactor] = useState<Factor | null>(null);

  // Activation en cours
  const [enrolling, setEnrolling] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) { setLoading(false); return; }
    const verified = (data?.totp || []).find((f) => f.status === 'verified') || null;
    setFactor(verified as Factor | null);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const start = async () => {
    setBusy(true);
    // Un essai précédent abandonné laisse un facteur « unverified » qui bloque
    // un nouvel enrôlement : on fait le ménage avant.
    const { data: list } = await supabase.auth.mfa.listFactors();
    for (const f of (list?.totp || []).filter((f) => f.status !== 'verified')) {
      await supabase.auth.mfa.unenroll({ factorId: f.id });
    }

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: `Globly ${new Date().toLocaleDateString()}`,
    });
    setBusy(false);
    if (error || !data) { showError(error?.message || t('msg.error', 'Une erreur est survenue.')); return; }
    setEnrolling({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
    setCode('');
  };

  const confirm = async () => {
    if (!enrolling || code.trim().length < 6) return;
    setBusy(true);
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: enrolling.id, code: code.trim() });
    setBusy(false);
    if (error) { showError(t('mfa.bad_code', 'Code incorrect. Réessayez.')); return; }
    setEnrolling(null);
    setCode('');
    await refresh();
    showSuccess(t('mfa.enabled', 'Double authentification activée.'));
  };

  const disable = async () => {
    if (!factor) return;
    setBusy(true);
    const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
    setBusy(false);
    if (error) { showError(error.message); return; }
    await refresh();
    showSuccess(t('mfa.disabled', 'Double authentification désactivée.'));
  };

  if (loading) return <div className="py-[2vh] text-white/40 text-sm font-light"><Loader2 className="w-4 h-4 animate-spin" /></div>;

  return (
    <div className="space-y-[2vh]">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[clamp(0.875rem,1vw,1rem)] font-light flex items-center gap-2">
            {t('mfa.title', 'Code de sécurité à la connexion')}
            {factor && <ShieldCheck className="w-4 h-4 text-emerald-400" />}
          </p>
          <p className="text-[clamp(0.65rem,0.8vw,0.75rem)] text-white/40 font-light">
            {factor
              ? t('mfa.on_hint', 'Activé. Un code de votre téléphone est demandé à chaque connexion.')
              : t('mfa.off_hint', 'En plus du mot de passe, un code à 6 chiffres depuis votre téléphone.')}
          </p>
        </div>

        {factor ? (
          <Button onClick={disable} disabled={busy}
            className="rounded-full h-10 px-5 bg-red-500/10 hover:bg-red-500/20 text-red-300 text-sm font-light">
            <Trash2 className="w-4 h-4 mr-2" /> {t('mfa.disable', 'Désactiver')}
          </Button>
        ) : !enrolling ? (
          <Button onClick={start} disabled={busy}
            className="rounded-full h-10 px-5 bg-white/10 hover:bg-white/20 text-white text-sm font-light">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : t('mfa.enable', 'Activer')}
          </Button>
        ) : null}
      </div>

      {enrolling && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
          <p className="text-sm font-light text-white/70">
            {t('mfa.step1', "1. Scannez cette image avec Google Authenticator (ou l'app de codes de votre téléphone).")}
          </p>
          <img src={enrolling.qr} alt="QR code" className="w-44 h-44 bg-white rounded-xl p-2" />
          <p className="text-xs text-white/40 font-light break-all">
            {t('mfa.manual', 'Ou saisissez cette clé à la main :')} <span className="text-white/70">{enrolling.secret}</span>
          </p>
          <p className="text-sm font-light text-white/70">{t('mfa.step2', "2. Tapez le code à 6 chiffres affiché par l'application.")}</p>
          <div className="flex gap-2 flex-wrap">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              placeholder="123456"
              className="w-36 bg-white/5 border border-white/10 rounded-full px-5 h-11 text-white tracking-[0.3em] text-center outline-none focus:border-primary/50"
            />
            <Button onClick={confirm} disabled={busy || code.length < 6}
              className="rounded-full h-11 px-6 bg-primary hover:bg-primary/90 text-white disabled:opacity-40">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : t('mfa.confirm', 'Valider')}
            </Button>
            <Button onClick={() => setEnrolling(null)}
              className="rounded-full h-11 px-5 bg-white/5 hover:bg-white/10 text-white/70">
              {t('common.cancel', 'Annuler')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
