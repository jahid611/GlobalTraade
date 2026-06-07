"use client";

import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { SolarSystem } from "@/components/SolarSystem";
import { ChatPanel } from "@/components/ChatPanel";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { UsersThree, Storefront, ChatCircle, Broadcast, MapPin, Plus } from "phosphor-react";
import { Loader2 } from "lucide-react";

export default function SectorNetwork() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [activeSector, setActiveSector] = useState<string | null>(null);
  const [chatListing, setChatListing] = useState<any | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Mes annonces -> mes secteurs
  const { data: myListings = [], isLoading: loadingMine } = useQuery({
    queryKey: ["my-listings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("listings").select("*").eq("owner_id", user!.id);
      return data || [];
    },
  });

  const mySectors = useMemo(
    () => Array.from(new Set(myListings.map((l: any) => l.industry).filter(Boolean))),
    [myListings]
  );
  const sector = activeSector || mySectors[0] || null;

  // Confrères du même secteur (autres annonces de la même industrie)
  const { data: peers = [], isLoading: loadingPeers } = useQuery({
    queryKey: ["sector-peers", sector, user?.id],
    enabled: !!user && !!sector,
    queryFn: async () => {
      const { data } = await supabase
        .from("listings")
        .select("*")
        .eq("industry", sector)
        .neq("owner_id", user!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const openChat = (listing: any) => {
    setChatListing(listing);
    setIsChatOpen(true);
  };

  const cityOf = (l: any) => l.location || (l.address ? String(l.address).split(",").slice(-1)[0].trim() : "—");

  return (
    <div className="min-h-screen bg-[#2b2a2f] text-white selection:bg-primary/30">
      <SolarSystem />
      <Navbar />

      <main className="relative z-10 pt-[20vh] pb-24 px-[6vw] max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-4xl md:text-5xl font-light mb-3 tracking-tight flex items-center gap-3">
            <UsersThree weight="duotone" className="text-primary" /> Réseau de mon secteur
          </h1>
          <p className="text-white/50 font-light max-w-2xl leading-relaxed">
            Tes repreneurs les plus probables sont <strong className="text-white/80">dans ton métier</strong>.
            Contacte les commerçants de ton secteur : en les approchant, ils sauront que tu envisages de céder.
          </p>
        </div>

        {loadingMine ? (
          <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : mySectors.length === 0 ? (
          // Pas d'annonce -> pas de secteur
          <div className="liquid-glass-heavy rounded-[2.5rem] p-12 border border-white/10 text-center max-w-2xl mx-auto">
            <Storefront weight="duotone" className="w-16 h-16 text-primary mx-auto mb-6" />
            <h2 className="text-2xl font-light mb-3">Rejoins ton réseau sectoriel</h2>
            <p className="text-white/50 mb-8 leading-relaxed">
              Publie d'abord ton annonce : ton secteur d'activité déterminera les commerçants que tu peux contacter.
            </p>
            <Link to="/marketplace">
              <Button className="rounded-full h-12 px-8 bg-white text-black hover:bg-white/90 font-medium">
                <Plus className="w-4 h-4 mr-2" /> Publier mon annonce
              </Button>
            </Link>
          </div>
        ) : (
          <>
            {/* Sélecteur de secteur (si plusieurs annonces) */}
            {mySectors.length > 1 && (
              <div className="flex flex-wrap gap-2 mb-8">
                {mySectors.map((s) => (
                  <button
                    key={s}
                    onClick={() => setActiveSector(s)}
                    className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
                      sector === s ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-white/5 text-white/50 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    {t(s as string, s as string)}
                  </button>
                ))}
              </div>
            )}

            {/* Bandeau secteur actif */}
            <div className="liquid-glass rounded-2xl p-5 border border-white/5 mb-8 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/15 text-primary"><Broadcast weight="duotone" size={24} /></div>
              <div>
                <div className="text-xs uppercase tracking-widest text-white/40">Ton secteur</div>
                <div className="text-lg font-medium">{t(sector as string, sector as string)}</div>
              </div>
              <div className="ml-auto text-right">
                <div className="text-2xl font-light">{peers.length}</div>
                <div className="text-xs text-white/40">confrère(s) joignable(s)</div>
              </div>
            </div>

            {/* Liste des confrères */}
            {loadingPeers ? (
              <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : peers.length === 0 ? (
              <div className="text-center py-20 text-white/30">
                <UsersThree className="w-12 h-12 mx-auto mb-4 opacity-40" />
                Aucun autre commerçant de ton secteur sur GlobalTrade pour l'instant.
                <br />Reviens bientôt — ton réseau grandit chaque jour.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {peers.map((l: any, i: number) => (
                  <motion.div
                    key={l.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.04, 0.4) }}
                    className="liquid-glass rounded-[2rem] p-6 border border-white/5 flex flex-col"
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center overflow-hidden shrink-0">
                        {l.logo_url ? (
                          <img src={l.logo_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Storefront weight="duotone" className="text-white/30" size={22} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium truncate">{l.name}</div>
                        <div className="text-white/40 text-sm flex items-center gap-1 truncate">
                          <MapPin size={12} /> {cityOf(l)}
                        </div>
                      </div>
                    </div>

                    <div className="text-xs uppercase tracking-widest text-primary/70 mb-4">
                      {String(t(l.industry, l.industry))}
                    </div>

                    {l.price ? (
                      <div className="text-sm text-white/50 mb-5">
                        Prix affiché : <strong className="text-white">{Number(l.price).toLocaleString("fr-FR")} €</strong>
                      </div>
                    ) : <div className="mb-5" />}

                    <Button
                      onClick={() => openChat(l)}
                      className="mt-auto w-full rounded-full h-11 bg-white text-black hover:bg-white/90 font-medium"
                    >
                      <ChatCircle weight="fill" className="w-4 h-4 mr-2" /> Contacter
                    </Button>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <ChatPanel
        key={chatListing?.id}
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        listing={chatListing}
        user={user}
      />
    </div>
  );
}
