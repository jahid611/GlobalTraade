import { defineConfig } from "vite";
import dyadComponentTagger from "@dyad-sh/react-vite-component-tagger";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// NOTE : l'ancien script de « purge de l'historique git » (execSync au chargement
// de la config) a été retiré : sur un clone frais, sans le marqueur .git-cleaned,
// il réécrivait tout l'historique au premier build. Plus jamais ça.

export default defineConfig(() => {
  // Récupération du plugin tagger de Dyad
  const tagger = dyadComponentTagger();
  const plugins = Array.isArray(tagger) ? tagger : [tagger];
  
  // On intercepte la fonction "transform" du plugin pour exclure les fichiers 3D
  // car le tagger injecte des propriétés qui font planter Three.js
  plugins.forEach(plugin => {
    if (plugin && typeof plugin.transform === 'function') {
      const originalTransform = plugin.transform;
      plugin.transform = function(this: unknown, code: string, id: string, options: unknown) {
        // Exclusion des fichiers 3D sensibles
        // On ajoute les nouveaux composants 3D à la liste d'exclusion
        if (
          id.includes('Globe.tsx') || 
          id.includes('SolarSystem.tsx') || 
          id.includes('MiniGlobeLoader.tsx') || 
          id.includes('SolarGlobe.tsx')
        ) {
          return null; 
        }
        return originalTransform.call(this, code, id, options);
      };
    }
  });

  return {
    server: {
      host: "::",
      port: 8080,
      // En production, /api/recherche-entreprises est une fonction Vercel
      // (api/recherche-entreprises.js). En local elle n'existe pas : on relaie
      // vers la même API publique pour que la page Prospection fonctionne.
      proxy: {
        "/api/recherche-entreprises": {
          target: "https://recherche-entreprises.api.gouv.fr",
          changeOrigin: true,
          rewrite: (path: string) => path.replace(/^\/api\/recherche-entreprises/, "/search"),
          // Le front joint le jeton de session pour le relais de production :
          // en local on ne le fait pas suivre à l'API de l'État.
          configure: (proxy: any) => {
            proxy.on("proxyReq", (proxyReq: any) => proxyReq.removeHeader("authorization"));
          },
        },
      },
    },
    build: {
      // Découpage des grosses dépendances en chunks séparés : chargement initial
      // plus léger et meilleure mise en cache (une lib mise à jour n'invalide pas
      // tout le bundle).
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (!id.includes("node_modules")) return;
            if (id.includes("three") || id.includes("@react-three")) return "three";
            if (id.includes("framer-motion")) return "framer";
            if (id.includes("jspdf") || id.includes("html2canvas")) return "pdf";
            if (id.includes("@tanstack")) return "query";
            if (id.includes("recharts") || id.includes("d3-")) return "charts";
          },
        },
      },
    },
    plugins: [...plugins, react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});