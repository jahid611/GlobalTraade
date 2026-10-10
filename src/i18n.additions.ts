// Clés de traduction ajoutées après le fichier principal (src/i18n.ts), pour ne
// pas alourdir encore ses 3 200 lignes. Elles sont fusionnées dans les
// ressources FR et EN ; une clé définie ici l'emporte sur le fichier principal.

export const additionsFr: Record<string, string> = {
  // Comparateur d'offres
  "compare.title": "Comparateur d'Offres",
  "compare.summary": "{{count}} offres reçues — Meilleure : {{amount}}",
  "compare.col_investor": "Investisseur",
  "compare.col_amount": "Montant",
  "compare.col_financing": "Financement",
  "compare.col_kyc": "KYC",
  "compare.col_score": "Score",
  "compare.pct_of_price": "{{pct}}% du prix",
  "compare.fin_cash": "Cash",
  "compare.fin_loan": "Emprunt",
  "compare.fin_mixed": "Mixte",
  "compare.fin_unknown": "Non précisé",
  "compare.investor": "Investisseur",
  "compare.score_basis": "Score basé sur : montant (40%), financement (25%), vérification KYC (20%), réactivité (15%)",
  // Notifications de correspondance
  "notif.gold_match": "Opportunité Or — {{score}}% Match",
  "notif.new_match": "Nouveau match {{score}}%",
  "notif.new_listing": "Nouvelle annonce",
  // Formulaire d'annonce
  "form.err_invalid_fields": "Certains champs sont manquants ou invalides. Corrigez-les pour enregistrer votre annonce.",
  // Projets et recherches de repreneurs
  "unlock.project_done": "Projet débloqué : le dossier complet est ouvert.",
  "searchads.delete_title": "Supprimer cette recherche ?",
  "searchads.delete_confirm": "Supprimer",
  "common.cancel": "Annuler",
};

export const additionsEn: Record<string, string> = {
  "compare.title": "Offer Comparator",
  "compare.summary": "{{count}} offers received — Best: {{amount}}",
  "compare.col_investor": "Investor",
  "compare.col_amount": "Amount",
  "compare.col_financing": "Financing",
  "compare.col_kyc": "KYC",
  "compare.col_score": "Score",
  "compare.pct_of_price": "{{pct}}% of price",
  "compare.fin_cash": "Cash",
  "compare.fin_loan": "Loan",
  "compare.fin_mixed": "Mixed",
  "compare.fin_unknown": "Not specified",
  "compare.investor": "Investor",
  "compare.score_basis": "Score based on: amount (40%), financing (25%), KYC verification (20%), responsiveness (15%)",
  "notif.gold_match": "Gold opportunity — {{score}}% match",
  "notif.new_match": "New match {{score}}%",
  "notif.new_listing": "New listing",
  "form.err_invalid_fields": "Some fields are missing or invalid. Fix them to save your listing.",
  "unlock.project_done": "Project unlocked: the full file is open.",
  "searchads.delete_title": "Delete this search?",
  "searchads.delete_confirm": "Delete",
  "common.cancel": "Cancel",
};
