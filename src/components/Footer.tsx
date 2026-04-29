import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function Footer() {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative z-10 pt-16 pb-8 border-t border-white/10 bg-black/20 backdrop-blur-md mt-auto text-white">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-10 md:gap-12 mb-16">
          
          <div className="md:col-span-5 flex flex-col items-start">
            <img src="/logo.png" alt="GlobeTrade" className="h-10 mb-6 opacity-90 object-contain" />
            <p className="text-white/50 text-sm font-light leading-relaxed max-w-sm">
              {t('footer.desc')}
            </p>
          </div>

          <div className="md:col-span-3">
            <h4 className="text-white font-medium mb-6 uppercase tracking-widest text-[11px] opacity-80">{t('footer.platform')}</h4>
            <ul className="space-y-4 text-sm font-light text-white/50">
              <li><Link to="/marketplace" className="hover:text-primary hover:translate-x-1 inline-block transition-all">{t('nav.market')}</Link></li>
              <li><Link to="/app" className="hover:text-primary hover:translate-x-1 inline-block transition-all">{t('nav.map')}</Link></li>
              <li><Link to="/dashboard" className="hover:text-primary hover:translate-x-1 inline-block transition-all">{t('nav.dashboard')}</Link></li>
            </ul>
          </div>

          <div className="md:col-span-2">
            <h4 className="text-white font-medium mb-6 uppercase tracking-widest text-[11px] opacity-80">{t('footer.company')}</h4>
            <ul className="space-y-4 text-sm font-light text-white/50">
              <li><Link to="/faq" className="hover:text-primary hover:translate-x-1 inline-block transition-all">{t('footer.faq')}</Link></li>
              <li><Link to="/contact" className="hover:text-primary hover:translate-x-1 inline-block transition-all">{t('footer.contact')}</Link></li>
            </ul>
          </div>

          <div className="md:col-span-2">
            <h4 className="text-white font-medium mb-6 uppercase tracking-widest text-[11px] opacity-80">{t('footer.legal_title')}</h4>
            <ul className="space-y-4 text-sm font-light text-white/50">
              <li><Link to="/terms" className="hover:text-primary hover:translate-x-1 inline-block transition-all">{t('footer.terms')}</Link></li>
              <li><Link to="/privacy" className="hover:text-primary hover:translate-x-1 inline-block transition-all">{t('footer.privacy')}</Link></li>
              <li><Link to="/legal" className="hover:text-primary hover:translate-x-1 inline-block transition-all">{t('footer.legal')}</Link></li>
            </ul>
          </div>

        </div>

        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-white/40 text-xs font-light">
            &copy; {currentYear} GlobeTrade. {t('footer.rights')}
          </p>
        </div>
      </div>
    </footer>
  );
}