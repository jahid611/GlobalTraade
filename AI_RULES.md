# Tech Stack

- You are building a React application.
- Use TypeScript.
- Use React Router. KEEP the routes in src/App.tsx
- Always put source code in the src folder.
- Put pages into src/pages/
- Put components into src/components/
- The main page (default page) is src/pages/Index.tsx
- UPDATE the main page to include the new components. OTHERWISE, the user can NOT see any components!
- ALWAYS try to use the shadcn/ui library.
- Tailwind CSS: always use Tailwind CSS for styling components. Utilize Tailwind classes extensively for layout, spacing, colors, and other design aspects.

Available packages and libraries:

- The lucide-react package is installed for icons.
- You ALREADY have ALL the shadcn/ui components and their dependencies installed. So you don't need to install them again.
- You have ALL the necessary Radix UI components installed.
- Use prebuilt components from the shadcn/ui library after importing them. Note that these files shouldn't be edited, so make new components if you need to change them.

## 🌐 RÈGLES DE TRADUCTION & I18N (CRITICAL)
- TOUT le texte affiché à l'utilisateur (frontend) DOIT être traduit à l'aide de `react-i18next`.
- Vous ne devez **JAMAIS** laisser de texte brut en français ou en anglais dans les composants. Utilisez toujours `t('votre.cle')`.
- Les clés de traduction non résolues (ex: affichage de "vdr.buyer_req" à l'écran) sont **strictement interdites**. Vous devez vous assurer que chaque clé utilisée dans un composant est dûment ajoutée et définie dans le fichier `src/i18n.ts` pour toutes les langues supportées (fr, en).
- En cas de doute, ajoutez toujours un fallback : `t('ma.cle', 'Texte par défaut')`.

## ⚠️ RÈGLE D'OR (CRITICAL RULE) ⚠️
Ne jamais, au grand jamais, réduire le code d'une page. Ne jamais enlever des éléments existants, ne jamais négliger des détails, et ne jamais simplifier une page. 
En cas de création ou d'édition, **ne JAMAIS enlever des fonctionnalités sans demande explicite de l'utilisateur**. 
Lors de l'édition d'un fichier, il FAUT impérativement conserver TOUT le code, les fonctionnalités, les imports et le rendu existant sans aucune perte d'informations ou de logique métier.

## 🚫 MODALES NATIVES INTERDITES (CRITICAL RULE)
- Vous ne devez **JAMAIS** utiliser les modales ou boîtes de dialogue natives du navigateur (`window.alert`, `window.confirm`, `window.prompt`).
- Ces méthodes bloquent le fil d'exécution et cassent l'expérience utilisateur globale.
- **Toute confirmation d'action (comme une suppression) DOIT être gérée avec une modale React / Framer Motion personnalisée et stylisée**.