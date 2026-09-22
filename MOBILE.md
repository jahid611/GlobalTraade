# Globly Mobile (Capacitor)

L'app mobile réutilise **le code web à l'identique**, emballé en app native iOS +
Android par Capacitor. Aucun code métier n'est dupliqué : `pnpm build` produit le
web, `cap sync` le copie dans les projets natifs.

## Commandes

```bash
pnpm cap:sync       # build web + sync iOS & Android
pnpm cap:ios        # build + sync + ouvre Xcode
pnpm cap:android    # build + sync + ouvre Android Studio
```

Le code spécifique mobile (barre de statut, encoche, bouton retour Android) est
dans `src/native.ts` — **no-op total sur le web**, activé seulement dans l'app.

## Prérequis (à installer une fois)

### iOS
- **Xcode** (présent) + **le SDK plateforme iOS** : Xcode → Settings → Components →
  installer « iOS 26 » (plusieurs Go). Sans lui, aucune compilation iOS possible.
  (Le projet natif est déjà généré et valide : SPM résout tous les plugins.)
- **Signature** : ouvrir `ios/App/App.xcodeproj`, onglet Signing & Capabilities,
  choisir ton équipe Apple (Team `CUJ98MYU9F`). Puis Run sur simulateur/appareil.

### Android
- **Android Studio** (SDK absent sur cette machine). Après install :
  `pnpm cap:android` ouvre le projet, Run sur émulateur/appareil.

## Paiements et connexion dans l'app (résolus)

1. **Paiement Stripe** — l'origine mobile est `capacitor://localhost`, que Stripe
   refuse comme `return_url` (https obligatoire). L'app envoie désormais
   `platform: 'native'` à `create-checkout-session`, qui crée la session avec
   `redirect_on_completion: 'never'` : **Stripe ne redirige plus du tout**, le
   modal Embedded Checkout appelle `onComplete` et l'app navigue elle-même vers
   la fiche débloquée. Aucun aller-retour hors de l'application.
   Côté web rien ne change, mais l'origine de la `return_url` est maintenant
   **validée** (https, ou localhost en dev) : poser le secret `SITE_URL` de la
   fonction évite toute dépendance à l'en-tête `Origin`.

   ⚠️ Reste une **décision produit**, pas technique : Apple prélève 30 % sur le
   numérique consommé dans l'app. À trancher avant soumission (exemption
   marketplace / achat sur le web uniquement / Apple IAP).

2. **Connexion Google** — Google refuse l'authentification dans une webview
   embarquée. L'app ouvre donc le **navigateur système** (`@capacitor/browser`)
   et le retour se fait par **deep link** `com.globly.app://auth-callback`,
   déclaré dans `ios/App/App/Info.plist` (CFBundleURLTypes) et dans le manifeste
   Android (intent-filter BROWSABLE). Le client Supabase passe en **flux PKCE**
   uniquement en natif, et `src/native.ts` échange le code contre une session à
   la réception du lien. Le web garde son flux d'origine.

   **À faire une fois dans Supabase** → Authentication > URL Configuration >
   Redirect URLs : ajouter `com.globly.app://auth-callback`.

   L'email/mot de passe fonctionne sans rien configurer.

Le reste (globe 3D, marketplace, messagerie, CRM, data room, favoris, profils)
fonctionne dans le webview sans modification.

## Ce qui est déjà fait

- Capacitor core + iOS + Android installés et configurés (`capacitor.config.ts`,
  appId `com.globly.app`).
- Projets natifs `ios/` et `android/` générés.
- Encoche/safe-areas gérées (`viewport-fit=cover` + `env(safe-area-inset-*)`).
- Barre de statut, clavier, bouton retour Android câblés (`src/native.ts`).
- Deep link `com.globly.app://` déclaré des deux côtés + réception dans `src/native.ts`.
- Paiement Stripe sans redirection et connexion Google par navigateur système.
