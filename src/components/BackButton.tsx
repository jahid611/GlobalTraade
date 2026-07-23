"use client";

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

// Petite flèche de retour flottante (façon Safari) : revient à la page précédente.
// Masquée là où ça n'a pas de sens (accueil, login) ou là où il y a déjà un retour
// dédié (carte /app en plein écran).
const HIDE_ON = ['/', '/login', '/app'];

export function BackButton() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  if (HIDE_ON.includes(pathname)) return null;

  const goBack = () => {
    // S'il y a un historique dans l'app, on revient ; sinon on va au tableau de bord.
    if (window.history.length > 1) navigate(-1);
    else navigate('/dashboard');
  };

  return (
    <button
      onClick={goBack}
      aria-label="Retour"
      className="fixed top-[calc(env(safe-area-inset-top,0px)+5rem)] sm:top-[calc(env(safe-area-inset-top,0px)+1.25rem)] left-4 sm:left-6 z-[101] w-10 h-10 sm:w-11 sm:h-11 rounded-full liquid-glass border border-white/15 bg-white/5 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/15 transition-all backdrop-blur-xl shadow-lg group"
    >
      <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
    </button>
  );
}
