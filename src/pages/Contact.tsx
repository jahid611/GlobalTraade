"use client";

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Mail, MapPin, Clock, Send, CheckCircle, Loader2 } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { SolarSystem } from '@/components/SolarSystem';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';

// Limites alignées sur les contraintes de la table `contact_messages`.
const MAX_NAME = 120;
const MAX_EMAIL = 200;
const MAX_SUBJECT = 200;
const MAX_MESSAGE = 5000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ContactField = 'name' | 'email' | 'subject' | 'message';

export default function Contact() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [form, setForm] = useState<Record<ContactField, string>>({ name: '', email: '', subject: '', message: '' });
  // Champ leurre : invisible pour un humain, rempli par les robots.
  const [website, setWebsite] = useState('');
  const [errors, setErrors] = useState<Partial<Record<ContactField, string>>>({});
  const [submitError, setSubmitError] = useState('');
  const [sending, setSending] = useState(false);

  // Membre connecté : nom et email pré-remplis (modifiables).
  useEffect(() => {
    if (!user) return;
    setForm((f) => ({
      ...f,
      name: f.name || (user.user_metadata?.full_name as string) || '',
      email: f.email || user.email || '',
    }));
  }, [user]);

  const setField = (field: ContactField) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = (): Partial<Record<ContactField, string>> => {
    const out: Partial<Record<ContactField, string>> = {};
    const name = form.name.trim();
    const email = form.email.trim();
    const subject = form.subject.trim();
    const message = form.message.trim();
    if (!name) out.name = t('contact.err_name', 'Indiquez votre nom.') as string;
    else if (name.length > MAX_NAME) out.name = t('contact.err_too_long', { max: MAX_NAME, defaultValue: '{{max}} caractères maximum.' }) as string;
    if (!email || email.length > MAX_EMAIL || !EMAIL_RE.test(email)) out.email = t('contact.err_email', 'Indiquez une adresse email valide.') as string;
    if (!subject) out.subject = t('contact.err_subject', "Indiquez le sujet de votre message.") as string;
    else if (subject.length > MAX_SUBJECT) out.subject = t('contact.err_too_long', { max: MAX_SUBJECT, defaultValue: '{{max}} caractères maximum.' }) as string;
    if (message.length < 10) out.message = t('contact.err_message', 'Votre message est trop court (10 caractères minimum).') as string;
    else if (message.length > MAX_MESSAGE) out.message = t('contact.err_too_long', { max: MAX_MESSAGE, defaultValue: '{{max}} caractères maximum.' }) as string;
    return out;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending) return;
    setSubmitError('');
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    // Robot : on répond comme si tout allait bien, sans rien enregistrer.
    if (website.trim()) { setIsSubmitted(true); return; }

    setSending(true);
    try {
      const { error } = await supabase.from('contact_messages').insert({
        name: form.name.trim(),
        email: form.email.trim(),
        subject: form.subject.trim(),
        message: form.message.trim(),
        user_id: user?.id ?? null,
      });
      if (error) throw error;
      setForm((f) => ({ ...f, subject: '', message: '' }));
      setIsSubmitted(true);
    } catch {
      setSubmitError(t('contact.err_send', "Votre message n'a pas pu être envoyé. Réessayez dans un instant ou écrivez-nous directement par email.") as string);
    } finally {
      setSending(false);
    }
  };

  const inputClass = (field: ContactField) =>
    `w-full liquid-glass bg-white/5 border rounded-xl px-5 py-4 text-white placeholder-white/30 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all !shadow-none ${errors[field] ? 'border-red-400/60' : 'border-white/10'}`;
  const fieldError = (field: ContactField) =>
    errors[field] ? <p id={`contact-${field}-error`} className="text-red-400 text-xs font-light ml-1">{errors[field]}</p> : null;

  return (
    <div className="min-h-screen bg-[#2b2a2f] text-white flex flex-col font-sans selection:bg-primary/30 relative overflow-x-hidden">
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.3, 0.15] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-[20%] -left-[10%] w-[60vw] h-[60vw] min-w-[500px] min-h-[500px] rounded-full bg-primary/20 blur-[130px]"
        />
        <motion.div 
          animate={{ scale: [1, 1.3, 1], opacity: [0.15, 0.25, 0.15] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute -bottom-[20%] -right-[10%] w-[60vw] h-[60vw] min-w-[500px] min-h-[500px] rounded-full bg-blue-500/20 blur-[130px]"
        />
      </div>

      <SolarSystem />
      <Navbar />
      
      <main className="flex-grow pt-[15vh] pb-[10vh] px-6 max-w-6xl mx-auto w-full relative z-10">
        
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="text-4xl md:text-5xl font-light tracking-tight mb-6"
          >
            {t('contact.title')}
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
            className="text-white/60 text-lg md:text-xl font-light leading-relaxed"
          >
            {t('contact.desc')}
          </motion.p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-start">
          
          {/* Formulaire de contact */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:col-span-7"
          >
            <div className="liquid-glass border border-white/10 rounded-[2rem] p-8 md:p-10">
              {isSubmitted ? (
                <div className="flex flex-col items-center justify-center text-center py-16">
                  <div className="w-20 h-20 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle size={40} />
                  </div>
                  <h3 className="text-2xl font-medium text-white mb-4">{t('contact.sent_title', 'Message envoyé')}</h3>
                  <p className="text-white/60 font-light text-lg">{t('contact.success')}</p>
                  <button 
                    onClick={() => setIsSubmitted(false)}
                    className="mt-8 px-8 py-3 liquid-glass bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-all text-sm uppercase tracking-widest font-medium !shadow-none"
                  >
                    {t('contact.new_message', 'Nouveau message')}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} noValidate className="space-y-6">
                  <div className="space-y-2">
                    <label htmlFor="contact-name" className="text-sm font-medium text-white/70 ml-1">{t('contact.name')}</label>
                    <input
                      id="contact-name"
                      type="text"
                      required
                      autoComplete="name"
                      maxLength={MAX_NAME}
                      value={form.name}
                      onChange={setField('name')}
                      aria-invalid={!!errors.name}
                      aria-describedby={errors.name ? 'contact-name-error' : undefined}
                      className={inputClass('name')}
                      placeholder={t('contact.name_ph', 'Jean Dupont') as string}
                    />
                    {fieldError('name')}
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="contact-email" className="text-sm font-medium text-white/70 ml-1">{t('auth.email')}</label>
                    <input
                      id="contact-email"
                      type="email"
                      required
                      autoComplete="email"
                      maxLength={MAX_EMAIL}
                      value={form.email}
                      onChange={setField('email')}
                      aria-invalid={!!errors.email}
                      aria-describedby={errors.email ? 'contact-email-error' : undefined}
                      className={inputClass('email')}
                      placeholder={t('contact.email_ph', 'jean.dupont@entreprise.com') as string}
                    />
                    {fieldError('email')}
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="contact-subject" className="text-sm font-medium text-white/70 ml-1">{t('contact.subject')}</label>
                    <input
                      id="contact-subject"
                      type="text"
                      required
                      maxLength={MAX_SUBJECT}
                      value={form.subject}
                      onChange={setField('subject')}
                      aria-invalid={!!errors.subject}
                      aria-describedby={errors.subject ? 'contact-subject-error' : undefined}
                      className={inputClass('subject')}
                      placeholder={t('contact.subject_ph', 'Demande de partenariat...') as string}
                    />
                    {fieldError('subject')}
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="contact-message" className="text-sm font-medium text-white/70 ml-1">{t('contact.message')}</label>
                    <textarea
                      id="contact-message"
                      required
                      rows={5}
                      maxLength={MAX_MESSAGE}
                      value={form.message}
                      onChange={setField('message')}
                      aria-invalid={!!errors.message}
                      aria-describedby={errors.message ? 'contact-message-error' : undefined}
                      className={`${inputClass('message')} resize-none`}
                      placeholder={t('contact.message_ph', 'Comment pouvons-nous vous aider ?') as string}
                    ></textarea>
                    {fieldError('message')}
                  </div>
                  {/* Champ leurre anti-robot : hors écran, hors tabulation, ignoré des lecteurs d'écran */}
                  <div aria-hidden="true" className="absolute -left-[9999px] top-auto w-px h-px overflow-hidden">
                    <label htmlFor="contact-website">Website</label>
                    <input id="contact-website" type="text" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
                  </div>
                  {submitError && (
                    <p role="alert" className="text-red-400 text-sm font-light bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 leading-relaxed">{submitError}</p>
                  )}
                  <button
                    type="submit"
                    disabled={sending}
                    className="w-full liquid-glass bg-primary border-none hover:bg-primary/90 text-white font-medium py-4 rounded-xl flex items-center justify-center gap-2 transition-all transform hover:-translate-y-1 disabled:opacity-60 disabled:hover:translate-y-0 disabled:cursor-not-allowed"
                  >
                    {sending ? t('contact.sending', 'Envoi en cours…') : t('contact.send')}
                    {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                  </button>
                </form>
              )}
            </div>
          </motion.div>

          {/* Informations de contact */}
          <motion.div 
            initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.3 }}
            className="lg:col-span-5"
          >
            <div className="liquid-glass border border-white/10 rounded-[2rem] p-8 md:p-10 h-full flex flex-col justify-center">
              <div className="mb-10">
                <h3 className="text-2xl font-medium text-white mb-4">{t('contact.info_title')}</h3>
                <p className="text-white/60 font-light leading-relaxed">
                  {t('contact.info_desc')}
                </p>
              </div>

              <div className="space-y-8">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full liquid-glass bg-primary/20 border-none text-primary flex items-center justify-center flex-shrink-0 !shadow-none">
                    <MapPin size={24} />
                  </div>
                  <div>
                    <h4 className="text-white font-medium mb-1">{t('contact.address_title')}</h4>
                    <p className="text-white/60 font-light">{t('contact.address')}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full liquid-glass bg-primary/20 border-none text-primary flex items-center justify-center flex-shrink-0 !shadow-none">
                    <Mail size={24} />
                  </div>
                  <div>
                    <h4 className="text-white font-medium mb-1">{t('contact.email_title')}</h4>
                    <p className="text-white/60 font-light">{t('contact.email')}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full liquid-glass bg-primary/20 border-none text-primary flex items-center justify-center flex-shrink-0 !shadow-none">
                    <Clock size={24} />
                  </div>
                  <div>
                    <h4 className="text-white font-medium mb-1">{t('contact.hours_title')}</h4>
                    <p className="text-white/60 font-light">{t('contact.hours')}</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

        </div>
      </main>
      <Footer />
    </div>
  );
}