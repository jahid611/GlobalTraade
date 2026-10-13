// Distingue « je me suis déconnecté » de « ma session a expiré ».
//
// Quand une page protégée perd son utilisateur alors qu'une session existait
// dans cet onglet et que personne n'a demandé la déconnexion, on affiche
// l'écran « session terminée » plutôt que de renvoyer sèchement à la connexion.

const HAD_SESSION = "globly.hadSession";
const LEAVING = "globly.leaving";

const store = () => {
  try { return window.sessionStorage; } catch { return null; }
};

/** Une page protégée s'est ouverte avec un utilisateur connecté. */
export function rememberSession() {
  store()?.setItem(HAD_SESSION, "1");
  store()?.removeItem(LEAVING);
}

/** À appeler juste avant une déconnexion voulue. */
export function markIntentionalSignOut() {
  store()?.setItem(LEAVING, "1");
  store()?.removeItem(HAD_SESSION);
}

/** Vrai une seule fois : la session a disparu sans déconnexion voulue. */
export function sessionWasLost(): boolean {
  const s = store();
  if (!s) return false;
  const lost = s.getItem(HAD_SESSION) === "1" && s.getItem(LEAVING) !== "1";
  s.removeItem(HAD_SESSION);
  s.removeItem(LEAVING);
  return lost;
}
