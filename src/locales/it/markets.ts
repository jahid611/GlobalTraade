// Traduzione italiana dei testi legati al paese dell'azienda: guida del paese, modulo di
// vendita, filtri di acquisto ed elenchi di selezione. Fonte: i testi francesi scritti
// nel codice (MarketGuide.tsx, ListingForm.tsx, src/lib/markets.ts…).

export const markets: Record<string, string> = {
  // Guida del paese
  "guide.title_FR": "Acquistare un'azienda in Francia",
  "guide.title_ES": "Acquistare un'azienda in Spagna",
  "guide.title_PT": "Acquistare un'azienda in Portogallo",
  "guide.title_DE": "Acquistare un'azienda in Germania",
  "guide.title_IT": "Acquistare un'azienda in Italia",
  "guide.title_GB": "Acquistare un'azienda nel Regno Unito",
  "guide.teaser": "Le fasi della vendita, gli aiuti al finanziamento e le parole del paese, spiegati in modo semplice.",
  "guide.loading": "Caricamento della guida…",
  "guide.tab_transfer": "Come si svolge la vendita",
  "guide.tab_financing": "Finanziamento",
  "guide.tab_glossary": "Vocabolario",
  "guide.banking_title": "Che cosa si aspettano in genere le banche",
  "guide.financing_title": "Gli enti che possono aiutarLa",
  "guide.official_site": "Vedi il sito ufficiale",
  "guide.new_tab": "(nuova scheda)",
  "guide.checked_on": "Fonti verificate il {{date}}.",
  "guide.see_sources": "Vedi le fonti",
  "guide.hide_sources": "Nascondi le fonti",
  "guide.disclaimer": "Queste informazioni sono generali. Non sostituiscono una consulenza legale o fiscale. Prima di firmare, consulti un professionista del paese (avvocato, notaio, commercialista).",
  "guide.s4_t3_other": "Contratto d'affitto",
  "dd.empty_country": "L'elenco riprende i documenti richiesti nel paese dell'azienda ({{country}}), con una spiegazione per ciascuno.",

  // Modulo di vendita
  "form.country": "Paese dell'azienda",
  "form.country_other": "Altro paese",
  "form.hint_country": "Scelga il paese in cui ha sede l'azienda. Il numero d'impresa richiesto e la ricerca dell'indirizzo si adattano a questo paese.",
  "form.hint_company_id": "Globly non può consultare online il registro di questo paese: questo numero sarà verificato dal team di Globly. Può nasconderlo qui sotto per restare anonimo.",
  "form.country_switched": "Questo indirizzo si trova in un altro paese: {{country}}. Il paese della Sua azienda è stato aggiornato. Controlli il numero dell'azienda al primo passo.",
  "form.address_country": "La ricerca riguarda questo paese: {{country}}. Per un'azienda situata altrove, cambi il paese al primo passo.",
  "form.address_none_country": "Nessun indirizzo trovato in questo paese ({{country}}). Controlli l'ortografia, oppure provi senza il numero civico e poi con la città.",
  "form.company_id_recheck": "Il numero inserito al primo passo non corrisponde al formato di questo paese ({{name}}). Torni al primo passo per correggerlo.",
  "form.lease_other": "Affitto dei locali e condizioni di gestione",
  "form.hint_lease_other": "Facoltativo. Se affitta i locali, indichi il tipo di contratto ({{lease}}), la data di scadenza e le attività consentite.",
  "form.hint_lease_generic": "Facoltativo. Se affitta i locali, indichi il tipo di contratto, la data di scadenza e le attività consentite.",
  "company_id.format_ok": "Il formato è corretto. Questo numero non è ancora stato verificato: lo controllerà il team di Globly.",
  "val.company_id_format": "Questo numero non ha il formato previsto ({{name}}). Esempio: {{example}}",
  "val.company_id_required": "Indichi il numero ufficiale di registrazione dell'azienda (almeno 5 caratteri).",
  "onb.company_id_check": "questo numero non sembra avere il formato abituale, lo controlli",
  "onb.legal_form_free": "Es.: società a responsabilità limitata",

  // Numero dell'azienda secondo il paese
  "market.xx.id_name": "Numero di identificazione",
  "market.fr.id_what": "Il numero di 14 cifre della sede, riportato sull'estratto Kbis e sulle fatture.",
  "market.es.id_what": "Il numero di identificazione fiscale (ex CIF). Società: una lettera, sette cifre e un carattere di controllo. Lavoratore autonomo (autónomo): otto cifre e una lettera.",
  "market.pt.id_what": "Il numero di identificazione della persona giuridica (o il NIF di un lavoratore autonomo): 9 cifre.",
  "market.de.id_what": "Il numero del registro di commercio (HRB o HRA seguito da cifre). Un'azienda non iscritta indica il proprio numero di partita IVA (USt-IdNr., DE + 9 cifre) o il proprio identificativo economico (W-IdNr.).",
  "market.it.id_what": "La partita IVA dell'azienda: 11 cifre.",
  "market.gb.id_what": "Il numero di registrazione presso Companies House: 8 cifre, oppure 2 lettere e 6 cifre.",
  "market.xx.id_what": "Il numero ufficiale di registrazione dell'azienda nel suo paese.",

  // Filtri, ricerche e progetto di acquisizione
  "filters.country": "Paese",
  "filters.all_countries": "Tutti i paesi",
  "filters.all_regions": "Tutte le regioni",
  "smart.f_countries": "Paesi",
  "smart.ph_countries": "Tutti i paesi",
  "smart.ph_regions_all": "Tutte le regioni",
  "bp.q_countries": "In quali paesi?",
  "bp.q_countries_hint": "Scelga uno o più paesi. Lasci vuoto se Le vanno bene tutti i paesi.",
  "bp.countries_ph": "Tutti i paesi",
  "bp.q_regions_hint_multi": "Le regioni dei paesi scelti. Lasci vuoto se Le va bene tutto il paese.",
  "bp.regions_ph_all": "Tutte le regioni",
  "bp.q_departments_hint_fr": "Solo in Francia: per essere più precisi di una regione, o per i territori d'oltremare.",
  "searchads.countries_ph": "Scegliere uno o più paesi",
  "searchads.regions_ph_multi": "Regioni precise (facoltativo se è scelto un paese)",
  "onb.geo_countries": "Paesi di interesse",
  "onb.geo_countries_ph": "Tutti i paesi",
  "onb.geo_regions": "Regioni di interesse",
  "onb.geo_regions_ph": "Tutte le regioni",
  "onb.geo_hint": "Facoltativo. Se in un paese non è scelta alcuna regione, vale tutto il paese.",

  // Scheda dell'annuncio
  "listing.id_label": "{{name}}:",
  "listing.id_verified": "{{name}} verificato",
  "listing.id_provided": "{{name}} indicato",
  "listing.country_rules": "Paese dell'azienda: {{country}}. Alla vendita si applicano le regole di questo paese. Gli importi sono indicati in euro.",

  // Elenchi di selezione
  "multiselect.search": "Cerca…",
  "multiselect.empty": "Nessun risultato",
};
