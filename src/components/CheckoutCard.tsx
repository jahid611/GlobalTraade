"use client";

import React, { useState } from 'react';
import { Button } from './ui/button';
import { Loader2, Lock, CreditCard } from 'lucide-react';

// Paiement « interface d'abord » : l'écran est réel, l'encaissement est
// simulé (Stripe sera branché ensuite). onSuccess active immédiatement
// l'abonnement / le déblocage / la mise en avant.

interface CheckoutCardProps {
  title: string;
  subtitle?: string;
  price: number;
  period?: string; // ex. "/ mois" pour les abonnements
  cta?: string;
  onSuccess: () => void | Promise<void>;
}

const CheckoutCard = ({ title, subtitle, price, period, cta, onSuccess }: CheckoutCardProps) => {
  const [loading, setLoading] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');

  const formatCardNumber = (v: string) =>
    v.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ');

  const formatExpiry = (v: string) => {
    const digits = v.replace(/\D/g, '').slice(0, 4);
    return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
  };

  const isValid = cardNumber.replace(/\s/g, '').length >= 15 && expiry.length === 5 && cvc.length >= 3;

  const handlePayment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isValid || loading) return;
    setLoading(true);
    // Traitement simulé le temps de brancher Stripe
    await new Promise(r => setTimeout(r, 1200));
    await onSuccess();
    setLoading(false);
  };

  return (
    <div className="liquid-glass p-8 rounded-[2rem] border-white/10 max-w-md w-full mx-auto text-white">
      <h2 className="text-2xl font-light mb-1">{title}</h2>
      {subtitle && <p className="text-white/50 font-light text-sm mb-6">{subtitle}</p>}

      <div className="flex items-baseline gap-1 mb-8">
        <span className="text-4xl font-light">{price}</span>
        <span className="text-2xl font-light">€</span>
        {period && <span className="text-sm text-white/40 ml-1">{period}</span>}
      </div>

      <form onSubmit={handlePayment} className="space-y-4">
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <label className="block text-[10px] uppercase tracking-widest text-white/40 mb-3 font-bold flex items-center gap-2">
            <CreditCard className="w-3.5 h-3.5" /> Carte bancaire
          </label>
          <input
            inputMode="numeric"
            autoComplete="cc-number"
            placeholder="1234 5678 9012 3456"
            value={cardNumber}
            onChange={e => setCardNumber(formatCardNumber(e.target.value))}
            className="w-full bg-transparent text-base text-white placeholder:text-white/30 outline-none mb-3"
          />
          <div className="flex gap-4">
            <input
              inputMode="numeric"
              autoComplete="cc-exp"
              placeholder="MM/AA"
              value={expiry}
              onChange={e => setExpiry(formatExpiry(e.target.value))}
              className="w-24 bg-transparent text-base text-white placeholder:text-white/30 outline-none"
            />
            <input
              inputMode="numeric"
              autoComplete="cc-csc"
              placeholder="CVC"
              value={cvc}
              onChange={e => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
              className="w-16 bg-transparent text-base text-white placeholder:text-white/30 outline-none"
            />
          </div>
        </div>

        <Button
          type="submit"
          disabled={loading || !isValid}
          className="w-full bg-primary hover:bg-primary/90 text-white h-12 rounded-full font-medium transition-all shadow-lg shadow-primary/20"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Lock className="w-4 h-4 mr-2" />}
          {loading ? 'Traitement...' : (cta || `Payer ${price} €`)}
        </Button>
      </form>

      <p className="text-center text-[10px] text-white/30 mt-5 uppercase tracking-widest font-light">
        Paiement sécurisé{period ? ' · Résiliable à tout moment' : ''}
      </p>
    </div>
  );
};

export default CheckoutCard;
