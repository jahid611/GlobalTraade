import { describe, it, expect } from 'vitest';
import { INDUSTRIES } from '@/lib/industries';
import { estimateValue } from '@/lib/valuation';
import { respond, welcome, type EngineInput, type EngineResult } from './engine';
import { valuationSector } from './flows';
import { KNOWLEDGE } from './knowledge';
import { euros } from './texts';
import { EMPTY_ENGINE_STATE, type EngineState, type FlowId, type KnowledgeEntry, type Lang, type QuickReply } from './types';

// Petite base fixe : les tests ne dépendent pas du contenu rédigé dans knowledge.ts.
const fiche = (id: string, step: KnowledgeEntry['step'], question: string, fr: string[], extra: Partial<KnowledgeEntry> = {}): KnowledgeEntry => ({
  id, step,
  question: { fr: question, en: `${question} (en)` },
  answer: { fr: `Fiche ${id}.`, en: `Topic ${id}.` },
  keywords: { fr, en: [] },
  ...extra,
});

const BASE: KnowledgeEntry[] = [
  fiche('ebe', 2, "C'est quoi l'EBE ?", ['ebe', 'excedent brut'], { related: ['etape-3', 'inconnue'], suggestFlow: 'estimate' }),
  fiche('etape-1', 1, 'Faire le point', ['faire le point']),
  fiche('etape-3', 3, 'Comment se calcule un prix ?', ['calcul du prix']),
  fiche('etape-5', 5, 'Quels documents préparer ?', ['documents']),
  fiche('etape-6', 6, 'Répondre aux repreneurs', ['repondre']),
  fiche('etape-7', 7, 'Négocier et signer', ['negocier']),
  fiche('bail-duree', 5, 'Combien de temps dure un bail ?', ['bail']),
  fiche('bail-cession', 5, 'Peut-on céder un bail ?', ['bail']),
];

const CTX = { currentYear: 2026 };
const flow = (id: FlowId): EngineInput => ({ type: 'flow', id });

// Enchaîne des entrées et rend le dernier résultat.
function run(inputs: EngineInput[], lang: Lang = 'fr', state: EngineState = EMPTY_ENGINE_STATE): EngineResult {
  let result: EngineResult = { replies: [], state };
  for (const input of inputs) result = respond(input, result.state, lang, CTX, BASE);
  return result;
}

const textOf = (result: EngineResult) => result.replies.map(reply => reply.text).join('\n');
const buttonsOf = (result: EngineResult): QuickReply[] => result.replies[result.replies.length - 1]?.quickReplies ?? [];
const actionsOf = (result: EngineResult) => buttonsOf(result).map(button => button.action);

describe('accueil et hors parcours', () => {
  it('accueille avec les trois parcours et « C\'est quoi l\'EBE ? »', () => {
    const hello = welcome('fr', { firstName: 'Paul' });
    expect(hello.text).toContain('Bonjour Paul');
    expect(hello.pose).toBe('bonjour');
    expect(hello.quickReplies?.map(b => b.action)).toEqual([
      { type: 'flow', id: 'estimate' }, { type: 'flow', id: 'listing' }, { type: 'flow', id: 'start' }, { type: 'topic', id: 'ebe' },
    ]);
    expect(welcome('en').text).toContain("I'm Globi");
  });

  it('est pur : mêmes entrées, mêmes sorties, sans toucher à l\'état reçu', () => {
    const state: EngineState = { flow: null, facts: { ca: 300000 } };
    const frozen = JSON.stringify(state);
    const first = respond('Combien vaut mon commerce ?', state, 'fr', CTX, BASE);
    const second = respond('Combien vaut mon commerce ?', state, 'fr', CTX, BASE);
    expect(second).toEqual(first);
    expect(JSON.stringify(state)).toBe(frozen);
  });

  it('reconnaît salutations et remerciements', () => {
    const hello = run(['Bonjour Globi']);
    expect(hello.replies[0].pose).toBe('bonjour');
    expect(actionsOf(hello)).toContainEqual({ type: 'flow', id: 'start' });
    expect(textOf(run(['merci beaucoup']))).toContain('Avec plaisir');
    expect(run(['merci beaucoup']).state.flow).toBeNull();
  });

  it('répond par la fiche quand la recherche est sûre, avec fiches liées et parcours suggéré', () => {
    const result = run(["C'est quoi l'EBE ?"]);
    expect(result.replies[0].text).toBe('Fiche ebe.');
    expect(result.replies[0].journey).toEqual({ step: 2, status: 'doing' });
    // « inconnue » n'existe pas dans la base : pas de bouton mort.
    expect(actionsOf(result)).toEqual([{ type: 'topic', id: 'etape-3' }, { type: 'flow', id: 'estimate' }]);
    expect(run(["C'est quoi l'EBE ?"], 'en').replies[0].text).toBe('Topic ebe.');
  });

  it('propose les candidats quand la question est ambiguë', () => {
    const result = run(['mon bail']);
    expect(textOf(result)).toContain('Vous voulez parler de');
    expect(actionsOf(result)).toEqual([{ type: 'topic', id: 'bail-duree' }, { type: 'topic', id: 'bail-cession' }]);
    expect(buttonsOf(result)[0].label).toBe('Combien de temps dure un bail ?');
  });

  it('avoue ne pas savoir, et propose parcours, fiches et contact', () => {
    const result = run(['quelle est la capitale du Pérou']);
    expect(textOf(result)).toContain("Je n'ai pas de réponse toute prête");
    const actions = actionsOf(result);
    expect(actions).toContainEqual({ type: 'flow', id: 'estimate' });
    expect(actions).toContainEqual({ type: 'flow', id: 'listing' });
    expect(actions).toContainEqual({ type: 'flow', id: 'start' });
    expect(actions).toContainEqual({ type: 'topic', id: 'ebe' });
    expect(actions).toContainEqual({ type: 'link', to: '/contact' });
  });

  it('lance les parcours par mots-clés', () => {
    expect(run(['Combien vaut mon commerce ?']).state.flow?.flow).toBe('estimate');
    expect(run(['je voudrais estimer mon affaire']).state.flow?.flow).toBe('estimate');
    expect(run(['quel prix de vente ?']).state.flow?.flow).toBe('estimate');
    expect(run(['Aide-moi à rédiger mon annonce']).state.flow?.flow).toBe('listing');
    expect(run(['je veux mettre en vente']).state.flow?.flow).toBe('listing');
    expect(run(['Je veux vendre, par où commencer ?']).state.flow?.flow).toBe('start');
    expect(run(['How much is my shop worth?'], 'en').state.flow?.flow).toBe('estimate');
  });

  it('ouvre une fiche par son bouton, et ne casse pas sur un lien ou un bouton inconnu', () => {
    expect(run([{ type: 'topic', id: 'etape-5' }]).replies[0].text).toBe('Fiche etape-5.');
    expect(run([{ type: 'link', to: '/contact' }]).replies).toEqual([]);
    expect(textOf(run([{ type: 'topic', id: 'fiche-disparue' }]))).toContain("Je n'ai pas de réponse toute prête");
    expect(textOf(run([{ type: 'cancel' }]))).toContain("rien à annuler");
  });
});

describe('parcours « Estimer mon prix »', () => {
  it('va au bout quand l\'EBE est connu, avec la fourchette de estimateValue', () => {
    const started = run([flow('estimate')]);
    expect(started.state.flow).toMatchObject({ flow: 'estimate', stepId: 'metier' });
    expect(started.replies[0].journey).toEqual({ step: 3, status: 'doing' });
    expect(actionsOf(started)).toContainEqual({ type: 'cancel' });

    const result = run([flow('estimate'), 'boulangerie', '300 000', 'oui', '45 000 €', 'oui']);
    const expected = estimateValue({ secteur: valuationSector('boulangerie', 'fr'), chiffreAffaires: 300000, ebe: 45000, dirigeantRemunere: true });
    expect(expected.famille).toBe('boulangerie-pâtisserie');

    expect(result.state.flow).toBeNull();
    expect(result.replies[0].text).toContain(`**Entre ${euros(expected.fourchette_basse, 'fr')} et ${euros(expected.fourchette_haute, 'fr')}**`);
    expect(result.replies[0].text).toContain('boulangerie-pâtisserie');
    expect(result.replies[0].pose).toBe('bravo');
    expect(result.replies[0].journey).toEqual({ step: 3, status: 'done' });
    expect(textOf(result)).toContain('Ce qui fait monter le prix');
    expect(textOf(result)).toContain('expert-comptable');
    expect(result.state.facts).toMatchObject({
      metier: 'boulangerie', ca: 300000, ebe: 45000, dirigeantRemunere: true,
      prixBas: expected.fourchette_basse, prixHaut: expected.fourchette_haute,
    });
    expect(actionsOf(result)[0]).toEqual({ type: 'flow', id: 'listing' });
    expect(actionsOf(result)).toContainEqual({ type: 'topic', id: 'etape-3' });
  });

  it('accepte le montant de l\'EBE donné d\'emblée', () => {
    const result = run([flow('estimate'), 'boulangerie', '300 000', 'oui, 45 000']);
    expect(result.state.flow?.stepId).toBe('salaire');
    expect(result.state.facts.ebe).toBe(45000);
  });

  it('approche l\'EBE en trois questions quand il n\'est pas connu', () => {
    const asked = run([flow('estimate'), 'resto', '200k', 'non']);
    expect(asked.state.flow?.stepId).toBe('achats');
    expect(textOf(asked)).toContain('trois questions');

    const computed = run([flow('estimate'), 'resto', '200k', 'non', '60 000', '40 000', '50 000']);
    expect(computed.state.flow?.stepId).toBe('salaire');
    expect(computed.state.facts).toMatchObject({ ebe: 50000, ebeApprox: true });
    expect(textOf(computed)).toContain(euros(50000, 'fr'));
    expect(textOf(computed)).toContain('approximation');
    expect(textOf(computed)).toContain('comptable');

    const result = run([flow('estimate'), 'resto', '200k', 'non', '60 000', '40 000', '50 000', 'je ne sais pas']);
    const expected = estimateValue({ secteur: valuationSector('resto', 'fr'), chiffreAffaires: 200000, ebe: 50000 });
    expect(expected.famille).toBe('restauration');
    expect(result.state.flow).toBeNull();
    expect(result.replies[0].text).toContain(euros(expected.fourchette_basse, 'fr'));
    expect(result.replies[0].text).toContain(euros(expected.fourchette_haute, 'fr'));
    expect(result.state.facts).toMatchObject({ prixBas: expected.fourchette_basse, prixHaut: expected.fourchette_haute });
    expect(result.state.facts.dirigeantRemunere).toBeUndefined();
  });

  it('écrit le résultat en anglais sans phrase française', () => {
    const result = run([flow('estimate'), 'bakery', '300,000', 'yes', '45,000', 'no'], 'en');
    const expected = estimateValue({ secteur: valuationSector('bakery', 'en'), chiffreAffaires: 300000, ebe: 45000, dirigeantRemunere: false });
    expect(expected.codes).toContain('dirigeant_non_remunere');
    const text = textOf(result);
    expect(text).toContain(`**Between ${euros(expected.fourchette_basse, 'en')} and ${euros(expected.fourchette_haute, 'en')}**`);
    expect(text).toContain('bakery and pastry');
    expect(text).toContain("You don't pay yourself a salary");
    for (const french of [...expected.remarques, expected.avertissement, expected.famille]) expect(text).not.toContain(french);
  });

  it('refuse gentiment les montants absurdes, sans avancer', () => {
    const zero = run([flow('estimate'), 'boulangerie', '0']);
    expect(zero.state.flow?.stepId).toBe('ca');
    expect(textOf(zero)).toContain('supérieur à zéro');

    const small = run([flow('estimate'), 'boulangerie', '300']);
    expect(small.state.flow?.stepId).toBe('ca');
    expect(textOf(small)).toContain('il manque peut-être des zéros');

    const tooHigh = run([flow('estimate'), 'boulangerie', '300 000', 'oui', '400 000']);
    expect(tooHigh.state.flow?.stepId).toBe('ebe');
    expect(textOf(tooHigh)).toContain("ne peut pas dépasser le chiffre d'affaires");
    expect(tooHigh.state.facts.ebe).toBeUndefined();
  });
});

describe('dans tout parcours', () => {
  it('quitte sur « annuler », « stop », « retour » ou le bouton Annuler', () => {
    for (const word of ['annuler', 'Stop', 'retour', { type: 'cancel' } as EngineInput]) {
      const result = run([flow('estimate'), 'boulangerie', word]);
      expect(result.state.flow).toBeNull();
      expect(result.state.facts.metier).toBe('boulangerie');
      expect(actionsOf(result)).toContainEqual({ type: 'flow', id: 'estimate' });
    }
  });

  it('reformule avec un exemple quand la réponse n\'est pas comprise, sans avancer', () => {
    const once = run([flow('estimate'), 'boulangerie', 'ça dépend des années']);
    expect(once.state.flow?.stepId).toBe('ca');
    expect(textOf(once)).toContain("Je n'ai pas bien compris");
    expect(textOf(once)).toContain('par exemple 250 000');
    expect(actionsOf(once)).toContainEqual({ type: 'cancel' });

    const twice = run([flow('estimate'), 'boulangerie', 'ça dépend des années', 'pfff']);
    expect(twice.state.flow?.stepId).toBe('ca');
    expect(textOf(twice)).toContain('toujours pas');

    // Une bonne réponse remet le compteur à zéro.
    const then = run([flow('estimate'), 'boulangerie', 'ça dépend des années', '300 000', 'hmm']);
    expect(then.state.flow?.stepId).toBe('ebe_connu');
    expect(textOf(then)).toContain("Je n'ai pas bien compris");
  });

  it('répond à une vraie question posée en chemin, puis repose la sienne', () => {
    const before = run([flow('estimate'), 'boulangerie']);
    const result = run([flow('estimate'), 'boulangerie', "c'est quoi l'EBE ?"]);
    expect(result.replies).toHaveLength(2);
    expect(result.replies[0].text).toBe('Fiche ebe.');
    expect(result.replies[1].text).toContain("chiffre d'affaires annuel");
    expect(result.state).toEqual(before.state);

    // Même à une question à réponse libre, et par le bouton d'une fiche.
    const atTrade = run([flow('estimate'), "C'est quoi l'EBE ?"]);
    expect(atTrade.replies[0].text).toBe('Fiche ebe.');
    expect(atTrade.state.flow?.stepId).toBe('metier');
    const byButton = run([flow('estimate'), 'boulangerie', '300 000', { type: 'topic', id: 'ebe' }]);
    expect(byButton.replies[0].text).toBe('Fiche ebe.');
    expect(byButton.state.flow?.stepId).toBe('ebe_connu');
  });
});

describe('métier écrit simplement', () => {
  it('hors parcours, « menuisier » est retenu au lieu de « je n\'ai pas compris »', () => {
    const noted = run(['menuisier']);
    expect(textOf(noted)).toContain('menuisier');
    expect(noted.state.facts.metier).toBe('menuisier');
    expect(noted.state.facts.industry).toBe('Joinery');
    expect(actionsOf(noted)).toContainEqual({ type: 'flow', id: 'estimate' });
  });

  it('il n\'est ensuite redemandé ni dans l\'estimation ni dans l\'annonce', () => {
    const noted = run(['je suis menuisier']);
    const estimate = run([flow('estimate')], 'fr', noted.state);
    expect(estimate.state.flow?.stepId).toBe('ca');
    expect(textOf(estimate)).toContain('menuisier');
    const listing = run([flow('listing'), 'Atelier Bois'], 'fr', noted.state);
    expect(listing.state.flow?.stepId).toBe('ville');
    expect(listing.state.flow?.data.industry).toBe('Joinery');
  });

  it('dans l\'annonce, « menuisier » ne déclenche pas la question du secteur', () => {
    const result = run([flow('listing'), 'Atelier Bois', 'menuisier']);
    expect(result.state.flow?.stepId).toBe('ville');
    expect(result.state.flow?.data.industry).toBe('Joinery');
  });

  it('une phrase qui n\'est pas un métier reste une question', () => {
    expect(run(['quel temps fait-il']).state.facts.metier).toBeUndefined();
  });
});

describe('estimation relancée', () => {
  it('confirme le métier déjà connu au lieu de le redemander', () => {
    const first = run([flow('estimate'), 'boulangerie', '300 000', 'oui', '45 000', 'oui']);
    const again = run([flow('estimate')], 'fr', first.state);
    expect(again.state.flow?.stepId).toBe('metier_connu');
    expect(textOf(again)).toContain('boulangerie');
    expect(run(['oui'], 'fr', again.state).state.flow?.stepId).toBe('ca');
  });

  it('laisse changer de métier', () => {
    const first = run([flow('estimate'), 'garage', '200 000']);
    const again = run([{ type: 'cancel' }, flow('estimate'), 'non'], 'fr', first.state);
    expect(again.state.flow?.stepId).toBe('metier');
    const changed = run(['fleuriste'], 'fr', again.state);
    expect(changed.state.flow?.stepId).toBe('ca');
    expect(changed.state.flow?.data.metier).toBe('fleuriste');
  });

  it('accepte un autre métier écrit directement à la confirmation', () => {
    const first = run([flow('estimate'), 'garage', '200 000']);
    const again = run([{ type: 'cancel' }, flow('estimate'), 'fleuriste'], 'fr', first.state);
    expect(again.state.flow?.stepId).toBe('ca');
    expect(again.state.flow?.data.metier).toBe('fleuriste');
  });
});

describe('parcours « Créer mon annonce »', () => {
  const estimated = () => run([flow('estimate'), 'boulangerie', '300 000', 'oui', '45 000', 'oui']);

  it('reprend ce qui est déjà connu et va au bout', () => {
    const start = run([flow('listing')], 'fr', estimated().state);
    expect(start.replies[0].text).toContain(`boulangerie, ${euros(300000, 'fr')} de chiffre d'affaires`);
    expect(start.replies[0].journey).toEqual({ step: 4, status: 'doing' });
    expect(start.state.flow?.stepId).toBe('nom');

    // Métier connu et secteur évident (« boulangerie » = « Boulangerie ») :
    // Globi ne redemande ni l'un ni l'autre et passe à la ville.
    const sector = run([flow('listing'), 'Chez Paul'], 'fr', estimated().state);
    expect(sector.state.flow?.stepId).toBe('ville');
    expect(sector.state.flow?.data.industry).toBe('Bakery');

    // Chiffre d'affaires et EBE connus : pas redemandés ; le prix propose la fourchette.
    const price = run([flow('listing'), 'Chez Paul', 'lyon'], 'fr', estimated().state);
    expect(price.state.flow?.stepId).toBe('prix');
    const { prixBas, prixHaut } = estimated().state.facts as { prixBas: number; prixHaut: number };
    expect(actionsOf(price)).toContainEqual({ type: 'answer', value: String(prixBas) });
    expect(actionsOf(price)).toContainEqual({ type: 'answer', value: String(prixHaut) });

    const result = run(
      [flow('listing'), 'Chez Paul', 'lyon', '200 000', '2', 'depuis 2008', 'retraite', 'emplacement'],
      'fr', estimated().state,
    );
    expect(result.state.flow).toBeNull();
    const reply = result.replies[0];
    expect(reply.pose).toBe('bravo');
    expect(reply.text).toContain('SIRET');
    expect(reply.text).toContain('adresse exacte');
    expect(reply.text).toContain('photos');
    expect(reply.text).not.toContain("secteur d'activité");
    const draft = reply.draft!;
    expect(draft).toMatchObject({
      name: 'Chez Paul', industry: 'Bakery', address: 'Lyon', price: 200000, revenue_n1: 300000, ebitda: 45000,
      employees: 2, established_year: 2008, reason_for_selling: 'Départ à la retraite',
    });
    expect(INDUSTRIES).toContain(draft.industry);
    expect(draft.description).toBe(
      `Chez Paul, boulangerie à Lyon, cherche son repreneur. En activité depuis 2008, l'affaire emploie 2 salariés. `
      + `Elle réalise un chiffre d'affaires annuel de ${euros(300000, 'fr')} hors taxes, pour un excédent brut d'exploitation (EBE) de ${euros(45000, 'fr')}. `
      + `Son emplacement est un vrai atout. Le cédant vend pour partir à la retraite. `
      + `Contactez le cédant sur Globly pour en savoir plus et organiser une visite.`,
    );
  });

  it('produit une description propre quand tout le facultatif est sauté', () => {
    const result = run([
      flow('listing'), 'rester discret', 'astronaute', 'Lyon', '120 000', 'je ne sais pas', '90 000', '0', '2015', 'autre',
      'rapprochement familial.', 'passer',
    ]);
    expect(result.state.flow).toBeNull();
    const draft = result.replies[0].draft!;
    expect(draft.name).toBe('Astronaute à Lyon');
    expect(draft.industry).toBeUndefined();
    expect(draft.ebitda).toBeUndefined();
    expect(draft).toMatchObject({ address: 'Lyon', price: 90000, revenue_n1: 120000, employees: 0, established_year: 2015, reason_for_selling: 'Rapprochement familial' });
    // Sans secteur reconnu, il reste à le choisir dans le formulaire.
    expect(result.replies[0].text).toContain("secteur d'activité");

    const description = draft.description!;
    expect(description).toBe(
      `Astronaute à Lyon cherche son repreneur. En activité depuis 2015, l'affaire est exploitée sans salarié. `
      + `Elle réalise un chiffre d'affaires annuel de ${euros(120000, 'fr')} hors taxes. Raison de la vente : rapprochement familial. `
      + `Contactez le cédant sur Globly pour en savoir plus et organiser une visite.`,
    );
    const sentences = description.split(/(?<=\.) /).length;
    expect(sentences).toBeGreaterThanOrEqual(4);
    expect(sentences).toBeLessThanOrEqual(6);
  });

  it('n\'écrit jamais « undefined », « null » ni double espace, quels que soient les choix', () => {
    const names = ['Chez Paul', 'rester discret'];
    const trades = ['boulangerie', 'coiffeur', 'astronaute'];
    const ebes = ['45 000', 'je ne sais pas', '-2000'];
    const reasons = [['retraite'], ['nouveau projet'], ['sante'], ['demenagement'], ['autre', 'envie de changer']];
    const strengths = ['emplacement', 'clientele', 'materiel', 'equipe', 'passer', 'Une terrasse de 40 places en plein centre'];
    for (const lang of ['fr', 'en'] as Lang[]) {
      for (const name of names) for (const trade of trades) for (const ebe of ebes) for (const reason of reasons) for (const strength of strengths) {
        let result = run([flow('listing'), name, trade], lang);
        // Secteur proposé seulement si le métier est reconnu.
        if (result.state.flow?.stepId === 'secteur') result = run([actionsOf(result)[0]], lang, result.state);
        result = run(['Lyon', '300 000', ebe, '200 000', '1', '2010', ...reason, strength], lang, result.state);
        expect(result.state.flow).toBeNull();
        const draft = result.replies[0].draft!;
        for (const text of [draft.description!, draft.name!, draft.reason_for_selling!, result.replies[0].text]) {
          expect(text).not.toMatch(/undefined|null|NaN|\{\w+\}| {2}/);
        }
        expect(draft.description).not.toMatch(/ [.,]|\.\.|,,/);
        if (draft.industry !== undefined) expect(INDUSTRIES).toContain(draft.industry);
        const sentences = draft.description!.split(/(?<=\.) /).length;
        expect(sentences).toBeGreaterThanOrEqual(4);
        expect(sentences).toBeLessThanOrEqual(6);
      }
    }
  });

  it('ne tourne jamais en boucle sur le secteur', () => {
    // « garage » peut être auto ou moto : là, Globi demande.
    const asked = run([flow('listing'), 'Chez Paul', 'garage']);
    expect(asked.state.flow?.stepId).toBe('secteur');
    // Une réponse hors des boutons : Globi propose une seule fois d'autres
    // secteurs, puis n'insiste plus — le secteur se choisira dans le formulaire.
    const once = run(['je bricole un peu de tout'], 'fr', asked.state);
    const vague = once.state.flow?.stepId === 'secteur' ? run(['je bricole un peu de tout'], 'fr', once.state) : once;
    expect(vague.state.flow?.stepId).toBe('ville');
    expect(textOf(vague)).toContain('dans le formulaire');
    // Et sans aucun rapport avec un métier : il passe tout de suite.
    const none = run(['xyz qsdf'], 'fr', asked.state);
    expect(none.state.flow?.stepId).toBe('ville');
    // Un libellé partiel suffit à choisir.
    const partial = run(['moto'], 'fr', asked.state);
    expect(partial.state.flow?.stepId).toBe('ville');
    expect(partial.state.flow?.data.industry).toBe('Motorcycle Garage');
  });

  it('un métier au secteur évident ne déclenche pas la question du secteur', () => {
    for (const trade of ['boulangerie', 'restaurant', 'pharmacie']) {
      const result = run([flow('listing'), 'Chez Paul', trade]);
      expect(result.state.flow?.stepId, trade).toBe('ville');
      expect(INDUSTRIES).toContain(result.state.flow?.data.industry);
    }
  });

  it('laisse choisir le secteur dans le formulaire sur « aucun de ceux-là »', () => {
    // « garage » peut être plusieurs secteurs : là, Globi demande.
    const asked = run([flow('listing'), 'Chez Paul', 'garage']);
    expect(asked.state.flow?.stepId).toBe('secteur');
    const result = run(['aucun de ceux-là'], 'fr', asked.state);
    expect(result.state.flow?.stepId).toBe('ville');
    expect(result.state.flow?.data.industry).toBeUndefined();
    expect(textOf(result)).toContain('dans le formulaire');
  });

  it('propose d\'estimer d\'abord, puis reprend l\'annonce là où elle en était', () => {
    const atPrice = run([flow('listing'), 'Chez Paul', 'boulangerie', 'Lyon', '300 000', 'je ne sais pas']);
    expect(atPrice.state.flow?.stepId).toBe('prix');
    expect(actionsOf(atPrice)).toContainEqual({ type: 'flow', id: 'estimate' });

    const estimated2 = run([flow('estimate'), 'boulangerie', '300 000', 'oui', '45 000', 'oui'], 'fr', atPrice.state);
    expect(estimated2.state.flow).toBeNull();

    const back = run([flow('listing')], 'fr', estimated2.state);
    expect(back.state.flow?.stepId).toBe('prix');
    expect(back.state.flow?.data).toMatchObject({ nom: 'Chez Paul', ville: 'Lyon', industry: 'Bakery', ebe: 45000 });
    expect(textOf(back)).toContain('Reprenons votre annonce');
    expect(actionsOf(back)).toContainEqual({ type: 'answer', value: String(estimated2.state.facts.prixBas) });
    expect(back.state.facts.annonceEnAttente).toBeUndefined();
  });

  it('refuse une année à venir et un prix nul', () => {
    const base: EngineInput[] = [flow('listing'), 'Chez Paul', 'astronaute', 'Lyon', '120 000', 'je ne sais pas'];
    const zero = run([...base, '0']);
    expect(zero.state.flow?.stepId).toBe('prix');
    const future = run([...base, '90 000', '1', '2031']);
    expect(future.state.flow?.stepId).toBe('annee');
    expect(textOf(future)).toContain("n'est pas encore arrivée");
    expect(run([...base, '90 000', '1', 'depuis 12 ans']).state.flow?.data.annee).toBe(2014);
  });
});

describe('parcours « Par où commencer ? »', () => {
  it('présente les 7 étapes et demande où en est l\'utilisateur', () => {
    const result = run([flow('start')]);
    expect(textOf(result)).toContain('7 étapes');
    expect(textOf(result)).toContain('7. Négocier, puis signer');
    expect(actionsOf(result).filter(a => a.type === 'answer')).toHaveLength(4);
    expect(result.state.flow?.stepId).toBe('situation');
  });

  it('oriente vers le bon parcours ou la bonne fiche', () => {
    const cases: [string, object[]][] = [
      ['Je réfléchis encore', [{ type: 'flow', id: 'estimate' }, { type: 'topic', id: 'etape-1' }]],
      ['Je suis décidé', [{ type: 'flow', id: 'estimate' }, { type: 'flow', id: 'listing' }]],
      ["J'ai déjà une annonce", [{ type: 'topic', id: 'etape-5' }, { type: 'topic', id: 'etape-6' }]],
      ["Un repreneur m'a contacté", [{ type: 'topic', id: 'etape-6' }, { type: 'topic', id: 'etape-7' }]],
    ];
    for (const [answer, expected] of cases) {
      const result = run([flow('start'), answer]);
      expect(result.state.flow).toBeNull();
      expect(actionsOf(result)).toEqual(expected);
    }
    expect(run([flow('start'), { type: 'answer', value: 'repreneur' }]).replies[0].journey).toEqual({ step: 6, status: 'doing' });
  });
});

describe('avec la vraie base de fiches', () => {
  it('contient les fiches que le moteur et « Mon parcours » appellent', () => {
    const ids = new Set(KNOWLEDGE.map(entry => entry.id));
    for (const id of ['ebe', 'etape-1', 'etape-2', 'etape-3', 'etape-4', 'etape-5', 'etape-6', 'etape-7']) expect(ids.has(id)).toBe(true);
  });

  it('répond à « C\'est quoi l\'EBE ? » par la fiche EBE, dans les deux langues', () => {
    const ebe = KNOWLEDGE.find(entry => entry.id === 'ebe')!;
    expect(respond("C'est quoi l'EBE ?", EMPTY_ENGINE_STATE, 'fr').replies[0].text).toBe(ebe.answer.fr);
    expect(respond({ type: 'topic', id: 'ebe' }, EMPTY_ENGINE_STATE, 'en').replies[0].text).toBe(ebe.answer.en);
  });

  it('ne propose aucun bouton vers une fiche absente', () => {
    const ids = new Set(KNOWLEDGE.map(entry => entry.id));
    for (const entry of KNOWLEDGE) {
      const { replies } = respond({ type: 'topic', id: entry.id }, EMPTY_ENGINE_STATE, 'fr');
      for (const button of replies[0].quickReplies ?? []) {
        if (button.action.type === 'topic') expect(ids.has(button.action.id)).toBe(true);
      }
    }
  });
});
