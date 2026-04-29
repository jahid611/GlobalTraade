import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { ChevronLeft, Loader2, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'next-themes';

const DynamicBackground = () => (
  <>
    <div className="fixed inset-0 z-0 overflow-hidden bg-slate-100 dark:hidden transition-colors duration-700">
      <motion.div animate={{ scale: [1, 1.2, 1], x: [0, 50, 0], y: [0, 30, 0] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }} className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-blue-300/30 blur-[120px]" />
      <motion.div animate={{ scale: [1, 1.3, 1], x: [0, -40, 0], y: [0, -50, 0] }} transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }} className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-purple-300/30 blur-[100px]" />
      
      {/* Astronaute (Mode Clair) */}
      <motion.img 
        src="/astronaut-login.png" 
        alt="" 
        animate={{ y: [0, -30, 0], rotate: [-2, 2, -2] }} 
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }} 
        className="absolute bottom-[-5%] left-[-5%] w-[50vw] min-w-[400px] max-w-[700px] opacity-40 pointer-events-none drop-shadow-2xl" 
      />
    </div>

    <div className="fixed inset-0 z-0 overflow-hidden bg-[#2b2a2f] hidden dark:block transition-colors duration-700">
      <motion.div animate={{ scale: [1, 1.2, 1], x: [0, 50, 0], y: [0, 30, 0] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }} className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-primary/20 blur-[120px]" />
      <motion.div animate={{ scale: [1, 1.3, 1], x: [0, -40, 0], y: [0, -50, 0] }} transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }} className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-blue-500/20 blur-[100px]" />
      
      {/* Astronaute (Mode Sombre) */}
      <motion.img 
        src="/astronaut-login.png" 
        alt="" 
        animate={{ y: [0, -30, 0], rotate: [-2, 2, -2] }} 
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }} 
        className="absolute bottom-[-5%] left-[-5%] w-[50vw] min-w-[400px] max-w-[700px] opacity-[0.25] pointer-events-none drop-shadow-[0_0_50px_rgba(89,85,232,0.3)]" 
      />
    </div>
  </>
);

type AuthMode = 'signin' | 'signup' | 'forgot_password' | 'reset_password';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<AuthMode>(location.state?.mode || 'signin');
  
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [carouselIndex, setCarouselIndex] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCarouselIndex((prev) => (prev + 1) % 2);
    }, 15000);
    return () => clearInterval(interval);
  }, [carouselIndex]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (mode === 'signup') {
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&._-])[A-Za-z\d@$!%*?&._-]{8,}$/;
      if (!passwordRegex.test(password)) {
        setError(t('val.password_strict'));
        setLoading(false);
        return;
      }
      const { error: signUpError } = await supabase.auth.signUp({ 
        email, password, options: { data: { full_name: fullName.trim() } }
      });
      if (signUpError) setError(signUpError.message);
      else navigate('/');
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) setError(signInError.message);
      else navigate('/');
    }
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/' }
    });
    if (error) setError(error.message);
    setLoading(false);
  };

  const toggleLanguage = () => {
    const newLang = i18n.language === 'fr' ? 'en' : 'fr';
    i18n.changeLanguage(newLang);
    localStorage.setItem('language', newLang);
  };

  const inputClass = "w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-full px-5 py-4 text-black dark:text-white font-light outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-slate-500 dark:placeholder:text-white/40 shadow-sm dark:shadow-none";

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      <DynamicBackground />

      <div className="absolute top-6 left-6 z-[100] flex items-center gap-4">
        <Link to="/">
          <Button variant="ghost" className="w-12 h-12 p-0 flex items-center justify-center rounded-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10 transition-all shadow-sm dark:shadow-none">
            <ChevronLeft className="w-6 h-6 text-slate-900 dark:text-white" />
          </Button>
        </Link>
        <img src="/logo.png" alt="GlobalTrade" className="h-10 object-contain drop-shadow-lg hidden sm:block" />
      </div>

      <div className="absolute top-6 right-6 z-[100] flex gap-3">
        <Button
          variant="ghost"
          onClick={toggleLanguage}
          className="w-12 h-12 p-0 flex items-center justify-center rounded-full bg-transparent border-0 hover:bg-transparent transition-all shadow-none text-slate-900 dark:text-white"
        >
          <img
            src={i18n.language === "fr" ? "/france.png" : "/royaume-uni.png"}
            alt={i18n.language === "fr" ? "French Flag" : "English Flag"}
            className="w-6 h-6 object-contain"
            loading="lazy"
            decoding="async"
          />
        </Button>
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
        <motion.div className={`w-full lg:w-1/2 flex flex-col justify-center p-8 lg:p-16 order-2 ${mode === 'signin' ? 'lg:order-1' : 'lg:order-2'} relative`}>
          <div className="max-w-xl mx-auto lg:mx-0 w-full relative min-h-[550px] sm:min-h-[600px] flex flex-col justify-center">
            <AnimatePresence mode="wait">
              {carouselIndex === 0 ? (
                <motion.div key={`text-${mode}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.4 }} className="w-full">
                  {mode === 'signup' ? (
                    <div>
                      <h2 className="text-[clamp(2rem,3vw,3.5rem)] font-light leading-tight mb-4 text-slate-900 dark:text-white tracking-tight">
                        {t('auth.hero.title1')} <br/>
                        <span className="font-medium text-primary">{t('auth.hero.title2')}</span>
                      </h2>
                      <p className="text-slate-600 dark:text-white/60 text-[clamp(1rem,1.2vw,1.25rem)] font-light mb-12">{t('auth.hero.desc')}</p>
                      <ul className="space-y-5 text-slate-700 dark:text-white/80 text-[clamp(0.9rem,1.1vw,1.05rem)] font-light leading-relaxed">
                        {[1,2,3,4,5].map(i => <li key={i} className="relative pl-6 before:content-['—'] before:absolute before:left-0 before:text-primary">{t(`auth.signup_f${i}`)}</li>)}
                      </ul>
                    </div>
                  ) : (
                    <div>
                      <h2 className="text-[clamp(2rem,3vw,3.5rem)] font-light leading-tight mb-4 text-slate-900 dark:text-white tracking-tight">
                        {t('auth.welcome.title1')} <br/>
                        <span className="font-medium text-primary">{t('auth.welcome.title2')}</span>
                      </h2>
                      <p className="text-slate-600 dark:text-white/60 text-[clamp(1rem,1.2vw,1.25rem)] font-light mb-12">{t('auth.welcome.desc')}</p>
                      <ul className="space-y-5 text-slate-700 dark:text-white/80 text-[clamp(0.9rem,1.1vw,1.05rem)] font-light leading-relaxed">
                        {[1,2,3,4,5].map(i => <li key={i} className="relative pl-6 before:content-['—'] before:absolute before:left-0 before:text-primary">{t(`auth.login_f${i}`)}</li>)}
                      </ul>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div key="mockup" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.4 }} className="w-full flex flex-col items-center justify-center py-4">
                  <div className="relative w-[240px] sm:w-[280px] mx-auto rounded-[2.5rem] sm:rounded-[3rem] border-[8px] sm:border-[10px] border-slate-900 bg-black shadow-2xl overflow-hidden ring-1 ring-white/10 flex">
                    <video 
                      ref={(el) => { if (el) el.playbackRate = 1.2; }}
                      src="https://kiwjjwcfuzhrurvlaiuk.supabase.co/storage/v1/object/public/listings/mobilemp4.mp4"
                      autoPlay 
                      loop 
                      muted 
                      playsInline 
                      className="w-full h-auto bg-black"
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

        <motion.div className={`w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-16 order-1 ${mode === 'signin' ? 'lg:order-2' : 'lg:order-1'} relative`}>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-primary/10 rounded-full blur-[100px] pointer-events-none hidden dark:block" />
          <div className="w-full max-w-[380px] flex flex-col relative z-20">
            <div className="text-center mb-10 mt-16 lg:mt-0">
              <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-slate-900 dark:text-white mb-2">GlobalTrade</h1>
              <h2 className="text-slate-500 dark:text-white/60 text-lg font-light">{mode === 'signin' ? t('auth.signin') : t('auth.signup')}</h2>
            </div>
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
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className={inputClass} placeholder="••••••••" />
              </div>
              {error && <p className="text-red-500 dark:text-red-400 text-sm text-center font-medium bg-red-100 dark:bg-red-500/10 py-2 rounded-lg">{error}</p>}
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
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#3c39db"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.16v2.84C3.99 20.53 7.7 23 12 23z" fill="#5955e8"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.16C1.43 8.55 1 10.22 1 12s.43 3.45 1.16 4.93l3.68-2.84z" fill="#9b99c9"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.16 7.07l3.68 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#3533b1"/>
              </svg>
              {t('auth.google')}
            </Button>
            <div className="mt-8 text-center">
              <button onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')} className="text-slate-600 dark:text-white/60 hover:text-primary dark:hover:text-white font-medium text-sm transition-colors">
                {mode === 'signin' ? t('auth.toggle_signup') : t('auth.toggle_signin')}
              </button>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}