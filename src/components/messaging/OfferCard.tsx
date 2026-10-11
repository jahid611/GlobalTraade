"use client";

import React from 'react';
import { Handshake, Check, XCircle, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { generateLOI } from '@/utils/loiGenerator';
import { useTranslation } from 'react-i18next';
import type { ChatMessage } from '@/types/domain';

interface OfferCardProps {
  msg: ChatMessage;
  isMine: boolean;
  /** nom de l'interlocuteur, affiché dans « Offre de … » */
  contactName: string;
  /** noms portés sur la lettre d'intention */
  loi: { buyerName: string; sellerName: string; listingName: string };
  onOfferAction: (msg: ChatMessage, status: string) => void;
  /** zone affichée sous MON offre tant qu'elle est en attente (retrait, attente…) */
  pendingMineSlot?: React.ReactNode;
}

// Carte d'offre partagée par le panneau de discussion (ChatPanel) et la
// messagerie (ChatWindow).
export function OfferCard({ msg, isMine, contactName, loi, onOfferAction, pendingMineSlot }: OfferCardProps) {
  const { t, i18n } = useTranslation();
  const isNeedOffer = msg.type === 'need_offer';
  const status = msg.metadata?.status || 'pending';
  const amount = msg.metadata?.amount || 0;
  const financing = msg.metadata?.financing || 'loan';

  const formattedAmount = isNeedOffer && isNaN(Number(amount))
    ? amount
    : new Intl.NumberFormat(i18n.language === 'fr' ? 'fr-FR' : 'en-US', {
      style: 'currency', currency: 'EUR', maximumFractionDigits: 0
    }).format(Number(amount));

  return (
    <div className={`w-full max-w-sm rounded-[1.5rem] p-5 border transition-all duration-500 hover:shadow-xl text-white ${
      isMine ? 'liquid-glass bg-primary/10 border-primary/30 shadow-[0_0_20px_rgba(168,85,247,0.15)] ml-auto' : 'liquid-glass bg-white/[0.03] border-white/10'
    }`}>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-inner ${isMine ? 'bg-primary/20 text-primary border border-primary/20' : 'bg-white/10 text-white/60 border border-white/10'}`}>
            <Handshake className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[9px] font-medium text-white/40 uppercase tracking-widest">
              {isMine ? (isNeedOffer ? t('needs.your_proposal', 'Votre proposition') : t('msg.your_offer', 'Votre offre')) : (isNeedOffer ? `${t('needs.proposal_from', 'Proposition de')} ${contactName}` : `${t('msg.offer_from', 'Offre de')} ${contactName}`)}
            </p>
            <p className="text-[13px] font-medium text-white">{isNeedOffer ? msg.metadata?.need_title : t('msg.negotiation', 'Négociation')}</p>
          </div>
        </div>
        <div className={`px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider border ${
          status === 'accepted' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
          status === 'declined' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
          'bg-white/5 text-white/50 border-white/10'
        }`}>
          {status === 'accepted' ? t('msg.offer_accepted', 'Acceptée') : status === 'declined' ? t('msg.offer_declined', 'Refusée') : t('msg.pending', 'En attente')}
        </div>
      </div>

      <div className="mb-5 p-4 rounded-2xl bg-black/20 backdrop-blur-md border border-white/5 flex flex-col items-center justify-center">
        <div className="text-2xl font-light text-white tracking-tight mb-2 text-center break-words">{formattedAmount}</div>
        {!isNeedOffer && (
          // Le libellé sur sa ligne, les parts en dessous : rien ne se coupe au
          // milieu, quelle que soit la longueur du texte.
          <div className="w-full flex flex-col items-center gap-2">
            <span className="text-[11px] text-white/50 uppercase tracking-widest font-medium text-center">{t('msg.offer_financing', 'Financement')}</span>
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {(financing && typeof financing === 'object'
                ? [`${t('msg.loan', 'Emprunt')} ${financing.loan} %`, `${t('msg.equity', 'Fonds propres')} ${financing.equity} %`]
                : [financing === 'cash' ? t('msg.financing_cash', 'Fonds propres') : t('msg.financing_loan', 'Emprunt')]
              ).map((label) => (
                <span key={label} className="text-[11px] text-primary font-medium px-2.5 py-1 bg-primary/10 rounded-md border border-primary/20 uppercase tracking-wider whitespace-nowrap">
                  {label}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {isNeedOffer && msg.metadata?.conditions && (
        <div className="mb-4 bg-white/5 p-3 rounded-xl border border-white/10">
          <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1 font-medium">{t('needs.offer_conditions', 'Conditions')}</p>
          <p className="text-xs text-white/80 font-light">{msg.metadata.conditions}</p>
        </div>
      )}

      <div className="space-y-4">
        {status === 'pending' ? (
          isMine ? (
            pendingMineSlot
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => onOfferAction(msg, 'declined')}
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-red-500/10 hover:border-red-500/30 text-white/60 hover:text-red-400 text-xs font-medium transition-all"
              >
                <XCircle className="w-4 h-4" /> {t('profile.decline', 'Refuser')}
              </button>
              <button
                onClick={() => onOfferAction(msg, 'accepted')}
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)]"
              >
                <Check className="w-4 h-4" /> {t('profile.accept', 'Accepter')}
              </button>
            </div>
          )
        ) : (
          <div className="space-y-3">
            {!isNeedOffer && status === 'accepted' && (
              <Button
                onClick={() => {
                  generateLOI({
                    buyerName: loi.buyerName,
                    sellerName: loi.sellerName,
                    listingName: loi.listingName,
                    amount: Number(amount),
                    financing: financing,
                    offerDate: msg.created_at,
                    acceptedDate: new Date().toISOString(),
                    lang: i18n.language,
                    t,
                  });
                }}
                variant="outline"
                className="w-full h-11 rounded-xl border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 text-xs font-medium transition-all group"
              >
                <Download className="w-4 h-4 mr-2 group-hover:-translate-y-0.5 transition-transform" /> {t('msg.generate_loi', 'Générer la LOI')}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
