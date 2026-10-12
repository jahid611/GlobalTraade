// Proxy serverless Vercel pour l'API publique "Recherche d'entreprises" (Etalab).
// Pourquoi : certains réseaux d'entreprise cassent/inspectent le TLS vers les
// domaines *.gouv.fr (ERR_SSL_PROTOCOL_ERROR côté navigateur). En passant par ce
// proxy, le navigateur ne parle qu'au domaine de l'app (Vercel) ; c'est Vercel,
// côté serveur, qui appelle l'API gouv. Plus fiable et sans souci CORS.

const UPSTREAM = "https://recherche-entreprises.api.gouv.fr/search";

// On ne relaie que les paramètres attendus, et seulement s'ils ont la forme
// attendue (évite un proxy ouvert). Tout le reste est ignoré.
const RULES = {
  activite_principale: /^[\dA-Z.,]{1,200}$/,
  departement: /^[\dAB,]{1,60}$/,
  region: /^[\d,]{1,40}$/,
  etat_administratif: /^[AC]$/,
  per_page: /^(?:[1-9]|1\d|2[0-5])$/,
  page: /^[1-9]\d{0,2}$/,
  q: /^[^\u0000-\u001f]{1,120}$/,
};

// Réservé aux membres connectés : sans cela, n'importe qui pouvait se servir du
// site comme relais vers l'API de l'État, aux frais et sur le quota de Globly.
async function isSignedIn(req) {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  const auth = req.headers.authorization || "";
  if (!url || !key || !/^Bearer [\w-]+\.[\w-]+\.[\w-]+$/.test(auth)) return false;
  const r = await fetch(`${url}/auth/v1/user`, { headers: { Authorization: auth, apikey: key } });
  return r.ok;
}

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") return res.status(405).json({ error: "method_not_allowed" });
    if (!(await isSignedIn(req))) return res.status(401).json({ error: "unauthenticated" });

    const incoming = req.query || {};
    const params = new URLSearchParams();
    for (const key of Object.keys(RULES).sort()) {
      const raw = Array.isArray(incoming[key]) ? incoming[key][0] : incoming[key];
      if (raw == null) continue;
      const value = String(raw);
      if (RULES[key].test(value)) params.set(key, value);
    }

    const upstream = `${UPSTREAM}?${params.toString()}`;
    const r = await fetch(upstream, { headers: { Accept: "application/json" } });
    const body = await r.text();

    // Réponse propre au membre connecté : cache du navigateur seulement.
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", r.ok ? "private, max-age=600" : "no-store");
    res.status(r.status).send(body);
  } catch (e) {
    console.error("[recherche-entreprises]", (e && e.message) || e);
    res.status(502).json({ error: "proxy_failed" });
  }
}
