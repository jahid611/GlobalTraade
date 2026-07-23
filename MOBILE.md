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

## ⚠️ À traiter AVANT de soumettre aux stores (verrouillé sur des décisions)

Ces deux points marchent en web mais pas tels quels dans le webview mobile :

1. **Retour de paiement Stripe** — `create-checkout-session` construit le
   `return_url` à partir de l'origine de la requête. En mobile l'origine est
   `capacitor://localhost`, que **Stripe refuse** (https obligatoire). À résoudre
   en même temps que la **stratégie de paiement iOS** (encore à trancher :
   exemption marketplace / paiement web / Apple IAP). Voir aussi la commission
   Apple de 30 % sur le numérique.

2. **OAuth Google (Supabase)** — la redirection OAuth ne revient pas dans un
   webview sans **deep link** (`com.globly.app://`) déclaré et ajouté aux URLs
   de redirection Supabase. **L'email/mot de passe fonctionne sans rien changer**
   → chemin recommandé pour une v1 mobile.

Le reste (globe 3D, marketplace, messagerie, CRM, data room, favoris, profils)
fonctionne dans le webview sans modification.

## Ce qui est déjà fait

- Capacitor core + iOS + Android installés et configurés (`capacitor.config.ts`,
  appId `com.globly.app`).
- Projets natifs `ios/` et `android/` générés.
- Encoche/safe-areas gérées (`viewport-fit=cover` + `env(safe-area-inset-*)`).
- Barre de statut, clavier, bouton retour Android câblés (`src/native.ts`).
