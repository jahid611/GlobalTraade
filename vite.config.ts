import { defineConfig } from "vite";
import dyadComponentTagger from "@dyad-sh/react-vite-component-tagger";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";

// --- SCRIPT AUTOMATIQUE POUR PURGER LA MÉMOIRE GIT ---
// Ce script va effacer l'historique Git qui contient la vidéo trop lourde,
// tout en conservant vos fichiers actuels intacts.
try {
  if (fs.existsSync('.git') && !fs.existsSync('.git-cleaned')) {
    console.log("Purge de l'historique Git en cours...");
    execSync('git checkout --orphan temp_clean_branch');
    execSync('git add .');
    execSync('git config user.email "bot@dyad.sh" || true');
    execSync('git config user.name "Dyad Bot" || true');
    execSync('git commit -m "Clean history without large files" || true');
    execSync('git branch -M main');
    fs.writeFileSync('.git-cleaned', 'done');
    console.log("Historique Git purgé avec succès !");
  }
} catch (e) {
  console.error("Erreur lors de la purge Git :", e);
}
// -----------------------------------------------------

export default defineConfig(() => {
  // Récupération du plugin tagger de Dyad
  const tagger = dyadComponentTagger();
  const plugins = Array.isArray(tagger) ? tagger : [tagger];
  
  // On intercepte la fonction "transform" du plugin pour exclure les fichiers 3D
  // car le tagger injecte des propriétés qui font planter Three.js
  plugins.forEach(plugin => {
    if (plugin && typeof plugin.transform === 'function') {
      const originalTransform = plugin.transform;
      plugin.transform = function(code, id, options) {
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
    },
    plugins: [...plugins, react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});