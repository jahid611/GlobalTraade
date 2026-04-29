"use client";

import React, { useState } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import toast from 'react-hot-toast';
import { Button } from './ui/button';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface PaymentCardProps {
  price: number;
  currency: string;
  onSuccess: () => void;
}

const PaymentCard = ({ price, currency, onSuccess }: PaymentCardProps) => {
  const [loading, setLoading] = useState(false);
  const stripe = useStripe();
  const elements = useElements();

  const handlePayment = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!stripe || !elements) return;

    setLoading(true);
    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) return;

      // 1. Appeler l'Edge Function pour créer le PaymentIntent sécurisé
      const { data, error: invokeError } = await supabase.functions.invoke('create-checkout-session', {
        body: { amount: price, currency: currency === '€' ? 'eur' : 'usd' }
      });

      if (invokeError) throw new Error(invokeError.message);
      if (data?.error) throw new Error(data.error);

      // 2. Confirmer le paiement avec le client secret renvoyé par le serveur
      const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(data.clientSecret, {
        payment_method: {
          card: cardElement,
        }
      });

      if (confirmError) {
        throw new Error(confirmError.message);
      }

      // 3. Vérifier le statut de l'intention de paiement
      if (paymentIntent?.status === 'succeeded') {
        onSuccess();
        toast.success('Paiement effectué avec succès !');
      } else {
        throw new Error('Le paiement est en attente ou a échoué.');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Une erreur est survenue lors du paiement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="liquid-glass p-8 rounded-[2rem] border-white/10 max-w-md w-full mx-auto text-white">
      <h2 className="text-2xl font-light mb-2">Abonnement Premium</h2>
      <p className="text-white/50 font-light mb-8">Accédez à toutes les fonctionnalités pour {price}{currency}</p>
      
      <form onSubmit={handlePayment} className="space-y-6">
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <label className="block text-[10px] uppercase tracking-widest text-white/40 mb-3 font-bold">Détails de la carte</label>
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#d2d1dd',
                  '::placeholder': {
                    color: 'rgba(255, 255, 255, 0.3)',
                  },
                },
                invalid: {
                  color: '#3533b1',
                },
              },
            }}
          />
        </div>
        
        <Button
          type="submit"
          disabled={loading || !stripe}
          className="w-full bg-primary hover:bg-primary/90 text-white h-12 rounded-full font-medium transition-all shadow-lg shadow-primary/20"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
          {loading ? 'Traitement...' : 'Confirmer le paiement'}
        </Button>
      </form>
    </div>
  );
};

export default PaymentCard;