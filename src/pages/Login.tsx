import { Capacitor } from '@capacitor/core';
import { markIntentionalSignOut } from '@/lib/sessionMemory';
import { LanguageMenu } from '@/components/LanguageMenu';
import { filmSrc } from '@/lib/film';
import { APP_SCHEME } from '@/native';
import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { ChevronLeft, Loader2, Sun, Moon, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'next-themes';
import { useAuth } from '@/components/AuthProvider';
import { showSuccess } from '@/utils/toast';

// Globi, au premier plan de la page (au-dessus du texte et du formulaire, sans
// jamais bloquer un clic).
const LoginMascot = ({ carouselIndex, signup }: { carouselIndex: number; signup: boolean }) => (
  // Sous 1024 px la page défile en une colonne : un Globi fixe passerait sur le
  // texte, il n'est donc affiché que sur grand écran.
  <div className="hidden lg:block fixed inset-0 z-[110] overflow-hidden pointer-events-none">
    <AnimatePresence>
      {carouselIndex === 0 && (
        <motion.div
          initial={{ opacity: 0, x: -60, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -60, scale: 0.95 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className={`absolute bottom-[-6%] ${signup ? "right-[-1%] flex justify-end" : "left-[-1%]"} w-[50vw] min-w-[400px] max-w-[700px] pointer-events-none z-0`}
        >
          {/* Écran peu haut (portable) : Globi descend et ne laisse dépasser que
              le haut du casque, pour ne jamais passer sur le texte. */}
          <div className="[@media(max-height:900px)]:translate-y-[60%] [@media(max-height:760px)]:translate-y-[66%]">
          <motion.img 
            // une pose pour la connexion, une autre pour l'inscription
            key={signup ? "signup" : "signin"}
            src={signup ? "/mascot/globi-inscription.png" : "/mascot/globi-connexion.png"}
            alt="" 
            animate={{ y: [0, -14, 0], rotate: [-2, 2, -2] }} 
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }} 
            className="w-auto"
            style={{ willChange: 'transform', height: 'min(30vh, 380px)' }}
          />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

const DynamicBackground = ({ carouselIndex, signup }: { carouselIndex: number; signup: boolean }) => (
  <div className="fixed inset-0 z-0 overflow-hidden bg-gradient-to-br from-slate-300 via-slate-200 to-blue-200/70 dark:from-[#2b2a2f] dark:via-[#2b2a2f] dark:to-[#2b2a2f] transition-colors duration-700">
    {/* Orbes floues optimisées */}
    <motion.div 
      animate={{ scale: [1, 1.05, 1], opacity: [0.4, 0.6, 0.4] }} 
      transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }} 
      className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-blue-400/45 dark:bg-primary/20 blur-[100px] sm:blur-[120px]"
      style={{ willChange: 'transform, opacity' }}
    />
    <motion.div 
      animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }} 
      transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }} 
      className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-purple-400/45 dark:bg-blue-500/20 blur-[80px] sm:blur-[100px]"
      style={{ willChange: 'transform, opacity' }}
    />
    
  </div>
);

type AuthMode = 'signin' | 'signup' | 'forgot_password' | 'reset_password';

// Mot de passe : 8 caractères minimum avec majuscule, minuscule et chiffre.
// Tout caractère est accepté (aucune liste blanche de symboles).
const isStrongPassword = (pwd: string) =>
  pwd.length >= 8 && /[a-z]/.test(pwd) && /[A-Z]/.test(pwd) && /\d/.test(pwd);

// Cible de retour après connexion : uniquement un chemin interne (posé par
// ProtectedRoute dans `location.state.from`), jamais une URL externe.
const internalPath = (from: unknown): string => {
  let path = '/';
  if (typeof from === 'string') path = from;
  else if (from && typeof from === 'object' && typeof (from as { pathname?: unknown }).pathname === 'string') {
    const loc = from as { pathname: string; search?: string; hash?: string };
    path = `${loc.pathname}${loc.search || ''}${loc.hash || ''}`;
  }
  if (!path.startsWith('/') || path[1] === '/' || path[1] === '\\') return '/';
  if (path === '/login' || path.startsWith('/login?') || path.startsWith('/login#')) return '/';
  return path;
};

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const { user, loading: authLoading } = useAuth();

  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<AuthMode>(() => {
    // Arrivée depuis le lien reçu par email : /login?mode=reset
    if (new URLSearchParams(location.search).get('mode') === 'reset') return 'reset_password';
    const wanted = location.state?.mode;
    return wanted === 'signup' || wanted === 'forgot_password' ? wanted : 'signin';
  });

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // Message d'information (email envoyé, vérifiez votre boîte mail…)
  const [info, setInfo] = useState("");
  // Double authentification : renseigné dès qu'un code de sécurité est attendu
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  // Une action de ce formulaire est en cours : elle gère elle-même la suite,
  // la redirection automatique « déjà connecté » ne doit pas la doubler.
  const busyRef = useRef(false);

  const [carouselIndex, setCarouselIndex] = useState(0);

  const returnTo = internalPath(location.state?.from);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCarouselIndex((prev) => (prev + 1) % 2);
    }, 15000);
    return () => clearInterval(interval);
  }, [carouselIndex]);

  // Lien de réinitialisation ouvert alors que la page est déjà montée.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setError("");
        setInfo("");
        setPassword("");
        setPasswordConfirm("");
        setMode('reset_password');
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const switchMode = (next: AuthMode) => {
    setError("");
    setInfo("");
    setPassword("");
    setPasswordConfirm("");
    setShowPassword(false);
    setMode(next);
  };

  // Erreurs Supabase courantes → message traduit (jamais le texte brut anglais).
  const authErrorMessage = (err: { message?: string; code?: string; status?: number } | null | undefined): string => {
    const code = err?.code || '';
    const msg = (err?.message || '').toLowerCase();
    if (code === 'invalid_credentials' || msg.includes('invalid login credentials'))
      return t('auth.err_invalid_credentials', 'Email ou mot de passe incorrect.') as string;
    if (code === 'email_not_confirmed' || msg.includes('email not confirmed'))
      return t('auth.err_email_not_confirmed', "Votre adresse email n'est pas encore confirmée. Cliquez sur le lien reçu par email.") as string;
    if (code === 'user_already_exists' || code === 'email_exists' || msg.includes('already registered') || msg.includes('already been registered'))
      return t('auth.err_email_taken', 'Un compte existe déjà avec cette adresse email. Connectez-vous.') as string;
    if (err?.status === 429 || code.includes('rate_limit') || msg.includes('rate limit') || msg.includes('too many') || msg.includes('for security purposes'))
      return t('auth.err_too_many', 'Trop de tentatives. Patientez quelques minutes avant de réessayer.') as string;
    if (code === 'weak_password' || msg.includes('password should'))
      return t('val.password_rules', 'Le mot de passe doit contenir au moins 8 caractères, dont une majuscule, une minuscule et un chiffre.') as string;
    if (code === 'same_password' || msg.includes('different from the old password'))
      return t('auth.err_same_password', "Le nouveau mot de passe doit être différent de l'ancien.") as string;
    if (code === 'session_not_found' || msg.includes('session missing') || msg.includes('session_not_found'))
      return t('auth.reset_link_invalid', 'Ce lien est invalide ou a expiré. Demandez un nouveau lien.') as string;
    if (msg.includes('failed to fetch') || msg.includes('network'))
      return t('auth.err_network', 'Connexion impossible. Vérifiez votre accès à Internet et réessayez.') as string;
    return t('auth.err_generic', 'Une erreur est survenue. Veuillez réessayer.') as string;
  };

  // Double authentification : après le mot de passe, la session est en « aal1 ».
  // Si le compte a un code de sécurité, Supabase attend « aal2 » → on demande
  // le code à 6 chiffres avant d'entrer dans l'app.
  // Renvoie null si le niveau n'a pas pu être vérifié (on n'entre alors pas).
  const requiresMfa = async (): Promise<boolean | null> => {
    const { data, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aalError || !data) return null;
    if (data.nextLevel !== 'aal2' || data.nextLevel === data.currentLevel) return false;
    const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
    if (factorsError) return null;
    const totp = (factors?.totp || []).find((f) => f.status === 'verified');
    if (!totp) return false;
    setMfaFactorId(totp.id);
    setMfaCode('');
    return true;
  };

  // Entre dans l'app (ou demande le code de sécurité) une fois la session ouverte.
  const enterApp = async () => {
    const needsCode = await requiresMfa();
    if (needsCode === false) navigate(returnTo, { replace: true });
    else if (needsCode === null) setError(t('auth.err_generic', 'Une erreur est survenue. Veuillez réessayer.') as string);
  };

  // Déjà connecté en arrivant sur /login → on repart vers la page demandée.
  // (Sauf pendant la réinitialisation du mot de passe, qui a besoin de la session.)
  useEffect(() => {
    if (authLoading || !user || busyRef.current) return;
    if (mode === 'reset_password' || mfaFactorId) return;
    let cancelled = false;
    (async () => {
      const needsCode = await requiresMfa();
      if (!cancelled && !busyRef.current && needsCode === false) navigate(returnTo, { replace: true });
    })();
    return () => { cancelled = true; };
  }, [authLoading, user?.id, mode, mfaFactorId]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    busyRef.current = true;

    try {
      if (mode === 'signup') {
        if (!isStrongPassword(password)) {
          setError(t('val.password_rules', 'Le mot de passe doit contenir au moins 8 caractères, dont une majuscule, une minuscule et un chiffre.') as string);
          return;
        }
        const { data, error: signUpError } = await supabase.auth.signUp({
          email, password, options: { data: { full_name: fullName.trim() } }
        });

        if (signUpError) {
          setError(authErrorMessage(signUpError));
        } else if (data.session) {
          await enterApp();
        } else {
          // Aucune session : le compte attend la confirmation de l'adresse email.
          setPassword("");
          setMode('signin');
          setInfo(t('auth.check_inbox', 'Vérifiez votre boîte mail : un lien de confirmation vient de vous être envoyé. Cliquez dessus puis connectez-vous.') as string);
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) setError(authErrorMessage(signInError));
        else await enterApp();
      }
    } catch (err) {
      setError(authErrorMessage(err as { message?: string }));
    } finally {
      busyRef.current = false;
      setLoading(false);
    }
  };

  // Mot de passe oublié : on répond toujours la même chose, que le compte
  // existe ou non (pas d'énumération de comptes).
  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    try {
      await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/login?mode=reset`,
      });
    } catch { /* même réponse dans tous les cas */ }
    setLoading(false);
    setInfo(t('auth.forgot_sent', 'Si un compte existe avec cette adresse, un email contenant un lien de réinitialisation vient de lui être envoyé.') as string);
  };

  // Enregistre le nouveau mot de passe (session ouverte par le lien reçu).
  const updatePassword = async () => {
    setLoading(true);
    busyRef.current = true;
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        // Compte protégé par un code de sécurité : Supabase l'exige avant de
        // changer le mot de passe → on le demande, puis on enregistre.
        if (updateError.code === 'insufficient_aal' && (await requiresMfa())) return;
        setError(authErrorMessage(updateError));
        return;
      }
      showSuccess(t('auth.reset_done', 'Votre mot de passe a été mis à jour.') as string);
      navigate(returnTo, { replace: true });
    } catch (err) {
      setError(authErrorMessage(err as { message?: string }));
    } finally {
      busyRef.current = false;
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    if (!isStrongPassword(password)) {
      setError(t('val.password_rules', 'Le mot de passe doit contenir au moins 8 caractères, dont une majuscule, une minuscule et un chiffre.') as string);
      return;
    }
    if (password !== passwordConfirm) {
      setError(t('auth.err_password_mismatch', 'Les deux mots de passe ne correspondent pas.') as string);
      return;
    }
    await updatePassword();
  };

  const submitMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaFactorId || mfaCode.length < 6) return;
    setLoading(true);
    setError("");
    const { error: mfaError } = await supabase.auth.mfa.challengeAndVerify({ factorId: mfaFactorId, code: mfaCode });
    setLoading(false);
    if (mfaError) { setError(t('mfa.bad_code', 'Code incorrect. Réessayez.') as string); return; }
    setMfaFactorId(null);
    // Code demandé pendant une réinitialisation : on termine l'enregistrement.
    if (mode === 'reset_password') { await updatePassword(); return; }
    navigate(returnTo, { replace: true });
  };

  const cancelMfa = async () => {
    // La session « aal1 » ne donne accès à rien : on la ferme proprement.
    markIntentionalSignOut();
    await supabase.auth.signOut();
    setMfaFactorId(null);
    setMfaCode('');
    setError("");
    if (mode === 'reset_password') switchMode('signin');
  };

  const handleGoogleLogin = async () => {
    setLoading(true);

    if (Capacitor.isNativePlatform()) {
      // Google refuse l'authentification dans une webview embarquée : on ouvre le
      // navigateur système, et le retour se fait par deep link (voir src/native.ts).
      // À déclarer dans Supabase > Authentication > URL Configuration :
      //   com.globly.app://auth-callback
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${APP_SCHEME}://auth-callback`, skipBrowserRedirect: true },
      });
      if (error) setError(authErrorMessage(error));
      else if (data?.url) {
        const { Browser } = await import('@capacitor/browser');
        await Browser.open({ url: data.url });
      }
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/' }
    });
    if (error) setError(authErrorMessage(error));
    setLoading(false);
  };


  const inputClass = "w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-full px-5 py-4 text-black dark:text-white font-light outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-slate-500 dark:placeholder:text-white/40 shadow-sm dark:shadow-none";

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      <DynamicBackground carouselIndex={carouselIndex} signup={mode === 'signup'} />
      <LoginMascot carouselIndex={carouselIndex} signup={mode === 'signup'} />

      <div className="absolute top-6 left-6 z-[100] flex items-center gap-4">
        <Link to="/">
          <Button variant="ghost" className="w-12 h-12 p-0 flex items-center justify-center rounded-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10 transition-all shadow-sm dark:shadow-none">
            <ChevronLeft className="w-6 h-6 text-slate-900 dark:text-white" />
          </Button>
        </Link>
        <img src="/logo.png" alt="Globly" className="h-10 object-contain drop-shadow-lg hidden sm:block" />
      </div>

      <div className="absolute top-6 right-6 z-[100] flex gap-3">
        <LanguageMenu className="w-12 h-12 flex items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary/70" />
        {mounted && (
          <Button
            variant="ghost"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="w-12 h-12 p-0 flex items-center justify-center rounded-full bg-transparent border-0 hover:bg-transparent transition-all shadow-none text-slate-900 dark:text-white"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
          </Button>
        )}
      </div>

      <main className="relative z-10 flex flex-col lg:flex-row w-full min-h-screen">
        <motion.div className={`w-full lg:w-1/2 flex flex-col justify-center p-8 lg:p-16 order-2 ${mode !== 'signup' ? 'lg:order-1' : 'lg:order-2'} relative`}>
          <div className="max-w-xl mx-auto lg:mx-0 w-full relative min-h-[550px] sm:min-h-[600px] flex flex-col justify-center">
            <AnimatePresence mode="wait">
              {carouselIndex === 0 ? (
                <motion.div key={`text-${mode}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.4 }} className="w-full relative z-10">
                  
                  {/* Halo fortement réduit pour ne plus baver sur l'astronaute */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100%] h-[110%] bg-slate-100/40 dark:bg-[#2b2a2f]/40 blur-[50px] sm:blur-[60px] -z-10 pointer-events-none rounded-[100%]" />

                  {mode === 'signup' ? (
                    <div>
                      <h2 className="text-[clamp(2rem,3vw,3.5rem)] font-light leading-tight mb-4 text-black dark:text-white tracking-tight [text-shadow:0_2px_3px_rgba(0,0,0,0.35),0_5px_14px_rgba(0,0,0,0.25)] dark:[text-shadow:0_2px_18px_rgba(0,0,0,0.95)]">
                        {t('auth.hero.title1')} <br/>
                        <span className="font-medium text-primary [text-shadow:0_2px_3px_rgba(0,0,0,0.3),0_5px_14px_rgba(0,0,0,0.22)] dark:[text-shadow:0_2px_18px_rgba(0,0,0,0.95)]">{t('auth.hero.title2')}</span>
                      </h2>
                      <p className="text-black dark:text-white text-[clamp(1rem,1.2vw,1.25rem)] font-light mb-12 [text-shadow:0_2px_4px_rgba(0,0,0,0.28)] dark:[text-shadow:0_2px_12px_rgba(0,0,0,0.9)]">{t('auth.hero.desc')}</p>
                      <ul className="space-y-5 text-black dark:text-white text-[clamp(0.9rem,1.1vw,1.05rem)] font-light leading-relaxed [text-shadow:0_2px_4px_rgba(0,0,0,0.26)] dark:[text-shadow:0_2px_12px_rgba(0,0,0,0.9)]">
                        {[1,2,3,4,5].map(i => <li key={i} className="relative pl-6 before:content-['—'] before:absolute before:left-0 before:text-primary">{t(`auth.signup_f${i}`)}</li>)}
                      </ul>
                    </div>
                  ) : (
                    <div>
                      <h2 className="text-[clamp(2rem,3vw,3.5rem)] font-light leading-tight mb-4 text-black dark:text-white tracking-tight [text-shadow:0_2px_3px_rgba(0,0,0,0.35),0_5px_14px_rgba(0,0,0,0.25)] dark:[text-shadow:0_2px_18px_rgba(0,0,0,0.95)]">
                        {t('auth.welcome.title1')}{' '}
                        <span className="font-medium text-primary [text-shadow:0_2px_3px_rgba(0,0,0,0.3),0_5px_14px_rgba(0,0,0,0.22)] dark:[text-shadow:0_2px_18px_rgba(0,0,0,0.95)] whitespace-nowrap">{t('auth.welcome.title2')}</span>
                      </h2>
                      <p className="text-black dark:text-white text-[clamp(1rem,1.2vw,1.25rem)] font-light mb-12 [text-shadow:0_2px_4px_rgba(0,0,0,0.28)] dark:[text-shadow:0_2px_12px_rgba(0,0,0,0.9)]">{t('auth.welcome.desc')}</p>
                      <ul className="space-y-5 text-black dark:text-white text-[clamp(0.9rem,1.1vw,1.05rem)] font-light leading-relaxed [text-shadow:0_2px_4px_rgba(0,0,0,0.26)] dark:[text-shadow:0_2px_12px_rgba(0,0,0,0.9)]">
                        {[1,2,3,4,5].map(i => <li key={i} className="relative pl-6 before:content-['—'] before:absolute before:left-0 before:text-primary">{t(`auth.login_f${i}`)}</li>)}
                      </ul>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div key="mockup" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.4 }} className="w-full flex flex-col items-center justify-center py-4">
                  <div
                    className="mx-auto drop-shadow-[0_30px_60px_rgba(0,0,0,0.5)] max-w-full"
                    style={{ position: 'relative', width: '300px', height: '500px' }}
                  >
                    <div
                      className="absolute z-0 rounded-[50%] bg-black/50 blur-[28px] pointer-events-none"
                      style={{ left: '4%', width: '60%', bottom: '-1%', height: '13%' }}
                    />
                    <div
                      className="absolute z-0 overflow-hidden"
                      style={{
                        top: 0, left: 0, width: '183px', height: '428px',
                        borderRadius: '22px',
                        transformOrigin: '0 0',
                        transform: 'matrix3d(0.8308191,0.02715642,0,-0.0005000255,-0.1752786,0.8737384,0,-0.0001427559,0,0,1,0,94.09488,26.13724,0,1)',
                      }}
                    >
                      <video
                        ref={(el) => { if (el) { el.playbackRate = 1; el.muted = true; el.play?.().catch(() => {}); } }}
                        key={filmSrc('mobile', i18n.language)}
                src={filmSrc('mobile', i18n.language)}
                        preload="metadata" autoPlay loop muted playsInline
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <img
                      src="/mockup-phone3d.png"
                      alt="Aperçu Globly sur mobile"
                      className="absolute inset-0 z-10 w-full h-full pointer-events-none select-none"
                    />
                  </div>
                  <h3 className="mt-8 text-center text-[clamp(1.25rem,1.5vw,1.5rem)] font-light text-slate-900 dark:text-white">{t('index.mobile.title')}</h3>
                  <p className="mt-2 text-center text-slate-500 dark:text-white/50 text-[clamp(0.875rem,1vw,1rem)] font-light max-w-sm mx-auto">{t('index.mobile.desc3')}</p>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="absolute bottom-[-1rem] lg:-bottom-6 left-0 right-0 flex justify-center gap-3 z-20">
              <button onClick={() => setCarouselIndex(0)} className={`h-2 rounded-full transition-all duration-300 ${carouselIndex === 0 ? 'w-8 bg-primary shadow-[0_0_10px_rgba(59,130,246,0.6)]' : 'w-2 bg-slate-300 dark:bg-white/20 hover:bg-primary/50'}`} />
              <button onClick={() => setCarouselIndex(1)} className={`h-2 rounded-full transition-all duration-300 ${carouselIndex === 1 ? 'w-8 bg-primary shadow-[0_0_10px_rgba(59,130,246,0.6)]' : 'w-2 bg-slate-300 dark:bg-white/20 hover:bg-primary/50'}`} />
            </div>
          </div>
        </motion.div>

        <motion.div className={`w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-16 order-1 ${mode !== 'signup' ? 'lg:order-2' : 'lg:order-1'} relative`}>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-primary/10 rounded-full blur-[100px] pointer-events-none hidden dark:block" />
          <div className="w-full max-w-[380px] flex flex-col relative z-20">
            <div className="flex flex-col items-center text-center mb-10 mt-16 lg:mt-0">
              <img src="/logo.png" alt="Globly" className="w-[120px] sm:w-[160px] h-auto object-contain drop-shadow-2xl mb-4" />
              <h2 className="text-slate-500 dark:text-white/60 text-lg font-light">{mode === 'signup' ? t('auth.signup')
                : mode === 'forgot_password' ? t('auth.forgot_title', 'Mot de passe oublié')
                : mode === 'reset_password' ? t('auth.reset_title', 'Nouveau mot de passe')
                : t('auth.signin')}</h2>
            </div>
            {mfaFactorId ? (
              <form onSubmit={submitMfa} className="flex flex-col gap-6">
                <div>
                  <label className="text-slate-700 dark:text-white/60 font-bold tracking-[0.15em] text-[10px] uppercase mb-2 block ml-2">
                    {t('mfa.login_label', 'Code de sécurité')}
                  </label>
                  <input
                    autoFocus
                    inputMode="numeric"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="123456"
                    className={`${inputClass} text-center tracking-[0.4em]`}
                  />
                  <p className="text-slate-500 dark:text-white/40 text-xs font-light mt-2 ml-2">
                    {t('mfa.login_hint', "Tapez le code à 6 chiffres affiché par l'application de votre téléphone.")}
                  </p>
                </div>
                {error && <p className="text-red-400 text-sm font-light text-center">{error}</p>}
                <Button type="submit" disabled={loading || mfaCode.length < 6}
                  className="w-full rounded-full h-14 bg-primary hover:bg-primary/90 text-white font-light disabled:opacity-40">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : t('mfa.confirm', 'Valider')}
                </Button>
                <button type="button" onClick={cancelMfa}
                  className="text-slate-500 dark:text-white/40 hover:text-primary text-sm font-light transition-colors">
                  {t('common.cancel', 'Annuler')}
                </button>
              </form>
            ) : mode === 'forgot_password' ? (
              <>
              <form onSubmit={handleForgot} className="flex flex-col gap-6">
                <p className="text-slate-600 dark:text-white/60 text-sm font-light text-center leading-relaxed">
                  {t('auth.forgot_desc', 'Indiquez votre adresse email : nous vous enverrons un lien pour choisir un nouveau mot de passe.')}
                </p>
                <div>
                  <label className="text-slate-700 dark:text-white/60 font-bold tracking-[0.15em] text-[10px] uppercase mb-2 block ml-2">{t('auth.email')}</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus autoComplete="email" className={inputClass} placeholder="jean@entreprise.com" />
                </div>
                {error && (
                <motion.p
                  role="alert"
                  initial={{ opacity: 0, x: 0 }}
                  animate={{ opacity: 1, x: [0, -6, 6, -4, 4, 0] }}
                  transition={{ duration: 0.4 }}
                  className="flex items-center gap-3 text-[15px] font-semibold py-3.5 px-4 rounded-2xl leading-snug text-left"
                  style={{ background: '#dc2626', color: '#ffffff', border: '1px solid #fca5a5', boxShadow: '0 8px 24px rgba(220,38,38,0.35)' }}
                >
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>{error}</span>
                </motion.p>
              )}
                {info && <p role="status" className="text-slate-700 dark:text-white/80 text-sm text-center font-light bg-primary/10 border border-primary/20 py-3 px-4 rounded-2xl leading-relaxed">{info}</p>}
                <Button type="submit" disabled={loading} className="w-full bg-primary hover:bg-primary/90 text-white rounded-full h-[54px] font-medium shadow-[0_10px_30px_rgba(59,130,246,0.3)] transition-all hover:scale-[1.02] active:scale-[0.98] mt-2">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : t('auth.forgot_submit', 'Envoyer le lien')}
                </Button>
              </form>
              <div className="mt-8 text-center">
                <button type="button" onClick={() => switchMode('signin')} className="text-slate-600 dark:text-white/60 hover:text-primary dark:hover:text-white font-medium text-sm transition-colors">
                  {t('auth.back_to_signin', 'Retour à la connexion')}
                </button>
              </div>
              </>
            ) : mode === 'reset_password' ? (
              authLoading ? (
                <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
              ) : !user ? (
                <div className="flex flex-col gap-6">
                  <p className="text-red-500 dark:text-red-400 text-sm text-center font-medium bg-red-100 dark:bg-red-500/10 py-3 px-4 rounded-lg leading-relaxed">
                    {t('auth.reset_link_invalid', 'Ce lien est invalide ou a expiré. Demandez un nouveau lien.')}
                  </p>
                  <Button type="button" onClick={() => { navigate('/login', { replace: true, state: location.state }); switchMode('forgot_password'); }} className="w-full bg-primary hover:bg-primary/90 text-white rounded-full h-[54px] font-medium shadow-[0_10px_30px_rgba(59,130,246,0.3)] transition-all hover:scale-[1.02] active:scale-[0.98] mt-2">
                    {t('auth.reset_request_new', 'Demander un nouveau lien')}
                  </Button>
                  <div className="text-center">
                    <button type="button" onClick={() => { navigate('/login', { replace: true, state: location.state }); switchMode('signin'); }} className="text-slate-600 dark:text-white/60 hover:text-primary dark:hover:text-white font-medium text-sm transition-colors">
                      {t('auth.back_to_signin', 'Retour à la connexion')}
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleReset} className="flex flex-col gap-6">
                  <p className="text-slate-600 dark:text-white/60 text-sm font-light text-center leading-relaxed">
                    {t('auth.reset_desc', 'Choisissez votre nouveau mot de passe.')}
                  </p>
                  <div>
                    <label className="text-slate-700 dark:text-white/60 font-bold tracking-[0.15em] text-[10px] uppercase mb-2 block ml-2">{t('auth.new_password', 'Nouveau mot de passe')}</label>
                    <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required autoFocus autoComplete="new-password" className={`${inputClass} pr-14`} placeholder="••••••••" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    aria-label={showPassword ? t('auth.hide_password', 'Masquer le mot de passe') : t('auth.show_password', 'Afficher le mot de passe')}
                    aria-pressed={showPassword}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full text-slate-500 hover:text-slate-900 dark:text-white/50 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                    <p className="text-slate-500 dark:text-white/40 text-xs font-light mt-2 ml-2">
                      {t('auth.password_hint', '8 caractères minimum, avec une majuscule, une minuscule et un chiffre.')}
                    </p>
                  </div>
                  <div>
                    <label className="text-slate-700 dark:text-white/60 font-bold tracking-[0.15em] text-[10px] uppercase mb-2 block ml-2">{t('auth.confirm_password', 'Confirmer le mot de passe')}</label>
                    <input type={showPassword ? 'text' : 'password'} value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)} required autoComplete="new-password" className={inputClass} placeholder="••••••••" />
                  </div>
                  {error && (
                <motion.p
                  role="alert"
                  initial={{ opacity: 0, x: 0 }}
                  animate={{ opacity: 1, x: [0, -6, 6, -4, 4, 0] }}
                  transition={{ duration: 0.4 }}
                  className="flex items-center gap-3 text-[15px] font-semibold py-3.5 px-4 rounded-2xl leading-snug text-left"
                  style={{ background: '#dc2626', color: '#ffffff', border: '1px solid #fca5a5', boxShadow: '0 8px 24px rgba(220,38,38,0.35)' }}
                >
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>{error}</span>
                </motion.p>
              )}
                  <Button type="submit" disabled={loading} className="w-full bg-primary hover:bg-primary/90 text-white rounded-full h-[54px] font-medium shadow-[0_10px_30px_rgba(59,130,246,0.3)] transition-all hover:scale-[1.02] active:scale-[0.98] mt-2">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : t('auth.reset_submit', 'Enregistrer le mot de passe')}
                  </Button>
                </form>
              )
            ) : (
            <>
            <form onSubmit={handleAuth} className="flex flex-col gap-6">
              {mode === 'signup' && (
                <div>
                  <label className="text-slate-700 dark:text-white/60 font-bold tracking-[0.15em] text-[10px] uppercase mb-2 block ml-2">{t('auth.fullname')}</label>
                  <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required className={inputClass} placeholder="Jean Dupont" />
                </div>
              )}
              <div>
                <label className="text-slate-700 dark:text-white/60 font-bold tracking-[0.15em] text-[10px] uppercase mb-2 block ml-2">{t('auth.email')}</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className={inputClass} placeholder="jean@entreprise.com" />
              </div>
              <div>
                <label className="text-slate-700 dark:text-white/60 font-bold tracking-[0.15em] text-[10px] uppercase mb-2 block ml-2">{t('auth.password')}</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} className={`${inputClass} pr-14`} placeholder="••••••••" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    aria-label={showPassword ? t('auth.hide_password', 'Masquer le mot de passe') : t('auth.show_password', 'Afficher le mot de passe')}
                    aria-pressed={showPassword}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full text-slate-500 hover:text-slate-900 dark:text-white/50 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {mode === 'signup' ? (
                  <p className="text-slate-500 dark:text-white/40 text-xs font-light mt-2 ml-2">
                    {t('auth.password_hint', '8 caractères minimum, avec une majuscule, une minuscule et un chiffre.')}
                  </p>
                ) : (
                  <div className="text-right mt-2 mr-2">
                    <button type="button" onClick={() => switchMode('forgot_password')} className="text-slate-600 dark:text-white/60 hover:text-primary dark:hover:text-white text-xs font-medium transition-colors">
                      {t('auth.forgot_link', 'Mot de passe oublié ?')}
                    </button>
                  </div>
                )}
              </div>
              {info && <p role="status" className="text-slate-700 dark:text-white/80 text-sm text-center font-light bg-primary/10 border border-primary/20 py-3 px-4 rounded-2xl leading-relaxed">{info}</p>}
              {error && (
                <motion.p
                  role="alert"
                  initial={{ opacity: 0, x: 0 }}
                  animate={{ opacity: 1, x: [0, -6, 6, -4, 4, 0] }}
                  transition={{ duration: 0.4 }}
                  className="flex items-center gap-3 text-[15px] font-semibold py-3.5 px-4 rounded-2xl leading-snug text-left"
                  style={{ background: '#dc2626', color: '#ffffff', border: '1px solid #fca5a5', boxShadow: '0 8px 24px rgba(220,38,38,0.35)' }}
                >
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>{error}</span>
                </motion.p>
              )}
              <Button type="submit" disabled={loading} className="w-full bg-primary hover:bg-primary/90 text-white rounded-full h-[54px] font-medium shadow-[0_10px_30px_rgba(59,130,246,0.3)] transition-all hover:scale-[1.02] active:scale-[0.98] mt-2">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (mode === 'signin' ? t('auth.signin') : t('auth.submit'))}
              </Button>
            </form>
            <div className="flex items-center my-8 gap-4">
              <div className="flex-1 border-t border-slate-300 dark:border-white/10"></div>
              <span className="text-slate-500 dark:text-white/60 text-[10px] font-bold uppercase tracking-widest">{t('auth.or')}</span>
              <div className="flex-1 border-t border-slate-300 dark:border-white/10"></div>
            </div>
            <Button type="button" variant="outline" onClick={handleGoogleLogin} disabled={loading} className="w-full rounded-full h-[54px] border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-white/10 font-medium transition-all flex items-center justify-center gap-3 shadow-sm dark:shadow-none hover:scale-[1.02] active:scale-[0.98]">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.16v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.16C1.43 8.55 1 10.22 1 12s.43 3.45 1.16 4.93l3.68-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.16 7.07l3.68 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              {t('auth.google')}
            </Button>
            <div className="mt-8 text-center">
              <button type="button" onClick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')} className="text-slate-600 dark:text-white/60 hover:text-primary dark:hover:text-white font-medium text-sm transition-colors">
                {mode === 'signin' ? t('auth.toggle_signup') : t('auth.toggle_signin')}
              </button>
            </div>
            </>
            )}
          </div>
        </motion.div>
      </main>
    </div>
  );
}