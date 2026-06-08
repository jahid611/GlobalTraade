// Proxy serverless Vercel pour l'API publique "Recherche d'entreprises" (Etalab).
// Pourquoi : certains réseaux d'entreprise cassent/inspectent le TLS vers les
// domaines *.gouv.fr (ERR_SSL_PROTOCOL_ERROR côté navigateur). En passant par ce
// proxy, le navigateur ne parle qu'au domaine de l'app (Vercel) ; c'est Vercel,
// côté serveur, qui appelle l'API gouv. Plus fiable et sans souci CORS.

const UPSTREAM = "https://recherche-entreprises.api.gouv.fr/search";

// On ne relaie que les paramètres attendus (évite un proxy ouvert).
const ALLOWED = new Set([
  "activite_principale",
  "departement",
  "region",
  "etat_administratif",
  "per_page",
  "page",
  "q",
]);

export default async function handler(req, res) {
  try {
    const incoming = req.query || {};
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(incoming)) {
      if (!ALLOWED.has(key) || value == null) continue;
      params.set(key, Array.isArray(value) ? value[0] : String(value));
    }

    const upstream = `${UPSTREAM}?${params.toString()}`;
    const r = await fetch(upstream, { headers: { Accept: "application/json" } });
    const body = await r.text();

    // Petit cache CDN : ces données bougent peu, ça allège l'API gouv.
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
    res.status(r.status).send(body);
  } catch (e) {
    res.status(502).json({ error: "proxy_failed", message: String((e && e.message) || e) });
  }
}
