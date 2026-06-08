import React, { useMemo } from 'react';
import { TrendingUp, BarChart3 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface MarketPulseProps {
  listings: Array<{ price: number; created_at: string; industry?: string }>;
}

export function MarketPulse({ listings }: MarketPulseProps) {
  const { t, i18n } = useTranslation();
  
  const stats = useMemo(() => {
    if (!listings.length) return null;

    const now = Date.now();
    const day = 86400000;
    const weeks = Array.from({ length: 8 }, (_, i) => {
      const start = now - (8 - i) * 7 * day;
      const end = now - (7 - i) * 7 * day;
      return listings.filter(l => {
        const t = new Date(l.created_at).getTime();
        return t >= start && t < end;
      }).length;
    });

    const maxW = Math.max(...weeks, 1);
    const sparkData = weeks.map(w => (w / maxW) * 100);

    // Top sectors
    const sectorCount: Record<string, number> = {};
    listings.forEach(l => {
      const s = l.industry || 'Autre';
      sectorCount[s] = (sectorCount[s] || 0) + 1;
    });
    const topSectors = Object.entries(sectorCount).sort((a, b) => b[1] - a[1]).slice(0, 4);
    const totalListings = listings.length;

    // Average price
    const prices = listings.filter(l => l.price > 0).map(l => l.price);
    const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;

    // This week vs last
    const thisWeek = weeks[7] || 0;
    const lastWeek = weeks[6] || 0;
    const trend = lastWeek > 0 ? ((thisWeek - lastWeek) / lastWeek) * 100 : 0;

    return { sparkData, topSectors, totalListings, avgPrice, thisWeek, trend };
  }, [listings]);

  if (!stats) return null;

  const fmt = (v: number) => new Intl.NumberFormat(i18n.language === 'fr' ? 'fr-FR' : 'en-US', { 
    style: 'currency', 
    currency: 'EUR', 
    maximumFractionDigits: 0 
  }).format(v);

  return (
    <div className="liquid-glass dark:bg-white/[0.02] border-white/30 dark:border-white/5 rounded-[2rem] p-6 sm:p-8 relative overflow-hidden group hover:border-white/50 dark:hover:bg-white/[0.04] transition-all duration-500">
      {/* Background Glow */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 dark:bg-emerald-500/5 blur-[80px] rounded-full" />
      
      <div className="flex items-center justify-between mb-8 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 dark:bg-emerald-500/10 flex items-center justify-center border border-emerald-500/40 dark:border-emerald-500/20">
            <BarChart3 className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
          </div>
          <span className="text-[clamp(10px,1vw,12px)] uppercase tracking-[0.2em] text-white dark:text-white/80 font-medium">{t('pulse.title')}</span>
        </div>
        <div className="flex items-center gap-2 bg-emerald-500/20 dark:bg-emerald-500/10 border border-emerald-500/40 dark:border-emerald-500/20 px-4 py-1.5 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.2)] dark:shadow-none">
          <div className={`w-2 h-2 rounded-full animate-pulse ${stats.trend >= 10 ? 'bg-emerald-400' : stats.trend >= -5 ? 'bg-blue-400' : 'bg-amber-400'}`} />
          <span className="text-[10px] uppercase tracking-widest text-white font-medium">
            {stats.trend >= 10 ? t('pulse.sentiment_high') : stats.trend >= -5 ? t('pulse.sentiment_mid') : t('pulse.sentiment_low')}
          </span>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 md:gap-10 relative z-10">
        {/* Colonne gauche : tendance + chiffres */}
        <div className="space-y-6">
          {/* Sparkline */}
          <div>
            <div className="flex items-end gap-1.5 h-16 mb-2">
              {stats.sparkData.map((h, i) => (
                <div key={i} className="flex-1 flex flex-col items-center justify-end group/bar">
                  <div
                    className={`w-full rounded-sm transition-all duration-500 ${i === stats.sparkData.length - 1 ? 'bg-gradient-to-t from-emerald-500 to-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.5)]' : 'bg-white/30 dark:bg-white/10 group-hover/bar:bg-white/50 dark:group-hover/bar:bg-white/20'}`}
                    style={{ height: `${Math.max(h, 6)}%` }}
                  />
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between text-[10px] text-white dark:text-white/40 font-medium">
              <span>{t('pulse.8weeks')}</span>
              <span>{t('pulse.this_week')}</span>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="liquid-glass dark:bg-white/[0.02] rounded-[1.25rem] p-3 sm:p-4 border-white/30 dark:border-white/5">
              <p className="text-2xl sm:text-3xl font-light text-white tabular-nums mb-1">{stats.thisWeek}</p>
              <p className="text-[9px] sm:text-[10px] text-white dark:text-white/60 uppercase tracking-widest font-medium leading-tight">{t('pulse.new_this_week')}</p>
            </div>
            <div className="liquid-glass dark:bg-white/[0.02] rounded-[1.25rem] p-3 sm:p-4 border-white/30 dark:border-white/5">
              <p className="text-2xl sm:text-3xl font-light text-white tabular-nums mb-1">{stats.totalListings}</p>
              <p className="text-[9px] sm:text-[10px] text-white dark:text-white/60 uppercase tracking-widest font-medium leading-tight">{t('pulse.total')}</p>
            </div>
            <div className="liquid-glass dark:bg-white/[0.02] rounded-[1.25rem] p-3 sm:p-4 border-white/30 dark:border-white/5">
              <p className={`text-2xl sm:text-3xl font-light tabular-nums mb-1 ${stats.trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {stats.trend >= 0 ? '+' : ''}{stats.trend.toFixed(0)}%
              </p>
              <p className="text-[9px] sm:text-[10px] text-white dark:text-white/60 uppercase tracking-widest font-medium leading-tight">{t('pulse.trend')}</p>
            </div>
          </div>

          {/* Average price */}
          <div className="pt-5 border-t border-white/30 dark:border-white/10 flex items-center justify-between">
            <span className="text-[10px] text-white dark:text-white/60 uppercase tracking-widest font-medium">{t('pulse.avg_price')}</span>
            <span className="text-xl sm:text-2xl font-light text-white tabular-nums tracking-tight">{fmt(stats.avgPrice)}</span>
          </div>
        </div>

        {/* Colonne droite : secteurs + note */}
        <div className="space-y-6 md:border-l md:border-white/10 md:pl-10">
          {/* Top sectors */}
          <div className="space-y-3">
            <span className="text-[10px] uppercase tracking-widest text-white dark:text-white/60 font-medium block mb-1">{t('pulse.top_sectors')}</span>
            {stats.topSectors.map(([name, count]) => (
              <div key={name} className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-white/20 dark:bg-white/10 rounded-full overflow-hidden border border-white/30 dark:border-white/5">
                  <div className="h-full bg-emerald-500/80 dark:bg-emerald-500/50 rounded-full" style={{ width: `${(count / stats.totalListings) * 100}%` }} />
                </div>
                <span className="text-[10px] text-white dark:text-white/60 font-medium w-28 truncate text-right">
                  {t(`industry.${name}`, { defaultValue: name })}
                </span>
                <span className="text-[11px] text-white font-medium tabular-nums w-8 text-right">{count}</span>
              </div>
            ))}
          </div>

          {/* Strategic Note */}
          <div className="p-5 rounded-[1.5rem] bg-primary/20 dark:bg-primary/5 border border-primary/40 dark:border-primary/10">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="text-[10px] text-white uppercase tracking-widest font-medium">{t('pulse.strategic_note')}</span>
            </div>
            <p className="text-[clamp(0.875rem,1vw,1rem)] text-white dark:text-white/70 leading-relaxed font-light">
              {t('pulse.note_desc')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}