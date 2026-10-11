import { describe, it, expect } from 'vitest';
import { STATUS_ORDER, type Prospect } from '@/services/prospectService';
import {
  PIPELINE_ORDER, EMPTY_FILTERS, dueState, buildAgenda, dueProspectIds, computeMetrics, filterProspects,
  countActiveFilters, collectTags, sortProspects, isValidEmail, isValidPhone, phoneHref, normalizeWebsite,
  parseAmount, addTag, scoreReasons, statusAfterContact, fold, TAGS_MAX, type CrmTask,
} from './crm';

// Mercredi 14 octobre 2026, 10 h (heure locale).
const NOW = new Date(2026, 9, 14, 10, 0, 0);
const at = (dayOffset: number, hour = 9) => new Date(2026, 9, 14 + dayOffset, hour, 0, 0).toISOString();

let seq = 0;
const prospect = (over: Partial<Prospect> = {}): Prospect => ({
  id: `p${++seq}`, siren: `${100000000 + seq}`, nom: `Société ${seq}`, code_ape: null, libelle_ape: null,
  ville: null, code_postal: null, departement: null, region: null, date_creation: null, anciennete: null,
  tranche_effectif: null, nature_juridique: null, dirigeant_nom: null, dirigeant_age: null, score: 0,
  status: 'a_qualifier', email: null, notes: null, created_at: at(-30), updated_at: at(-30),
  ...over,
});
const task = (over: Partial<CrmTask> = {}): CrmTask => ({
  id: `t${++seq}`, prospect_id: 'x', title: 'Rappeler', due_at: null, done_at: null, created_at: at(-1), ...over,
});

describe('étapes du pipeline', () => {
  it('suit le même ordre que STATUS_ORDER', () => {
    expect(PIPELINE_ORDER).toEqual(STATUS_ORDER);
  });
  it('un premier message fait passer à « Contacté », sans faire reculer un dossier avancé', () => {
    expect(statusAfterContact('a_qualifier')).toBe('contacte');
    expect(statusAfterContact('email_trouve')).toBe('contacte');
    expect(statusAfterContact('relance_1')).toBe('relance_1');
    expect(statusAfterContact('interesse')).toBe('interesse');
  });
});

describe('dueState', () => {
  it('compare des jours, pas des heures', () => {
    expect(dueState(at(0, 8), NOW)).toBe('today');   // plus tôt ce matin : pas « en retard »
    expect(dueState(at(0, 23), NOW)).toBe('today');
    expect(dueState(at(-1, 23), NOW)).toBe('overdue');
    expect(dueState(at(1, 0), NOW)).toBe('upcoming');
  });
  it('ignore les dates absentes ou illisibles', () => {
    expect(dueState(null, NOW)).toBeNull();
    expect(dueState(undefined, NOW)).toBeNull();
    expect(dueState('pas une date', NOW)).toBeNull();
  });
});

describe('buildAgenda', () => {
  const late = prospect({ nom: 'Retard', next_action_at: at(-3), next_action_label: 'Relancer' });
  const today = prospect({ nom: 'Jour', next_action_at: at(0, 15) });
  const later = prospect({ nom: 'Futur', next_action_at: at(4) });
  const archived = prospect({ nom: 'Archivé', next_action_at: at(-2), archived: true });
  const tasks = [
    task({ prospect_id: later.id, title: 'Envoyer le NDA', due_at: at(-1) }),
    task({ prospect_id: later.id, title: 'Déjà fait', due_at: at(-5), done_at: at(-4) }),
    task({ prospect_id: later.id, title: 'Sans échéance' }),
    task({ prospect_id: later.id, title: 'Plus tard', due_at: at(2) }),
    task({ prospect_id: archived.id, title: 'Sur un archivé', due_at: at(-1) }),
    task({ prospect_id: 'inconnu', title: 'Orpheline', due_at: at(-1) }),
  ];
  const agenda = buildAgenda([late, today, later, archived], tasks, NOW);

  it('ne retient que ce qui est échu ou du jour, hors archivés et tâches cochées', () => {
    expect(agenda.map((a) => a.label || a.prospectName)).toEqual(['Relancer', 'Envoyer le NDA', 'Jour']);
  });
  it('classe du plus ancien au plus récent et qualifie chaque ligne', () => {
    expect(agenda.map((a) => a.state)).toEqual(['overdue', 'overdue', 'today']);
    expect(agenda.map((a) => a.kind)).toEqual(['action', 'task', 'action']);
  });
  it('donne les prospects à relancer', () => {
    expect([...dueProspectIds(agenda)].sort()).toEqual([late.id, today.id, later.id].sort());
  });
});

describe('computeMetrics', () => {
  const list = [
    prospect({ status: 'a_qualifier', estimated_value: 100 }),
    prospect({ status: 'contacte', estimated_value: 200 }),
    prospect({ status: 'relance_1' }),
    prospect({ status: 'reponse', estimated_value: 50 }),
    prospect({ status: 'interesse', estimated_value: 1000 }),
    prospect({ status: 'refus', estimated_value: 400 }),
    prospect({ status: 'interesse', estimated_value: 9999, archived: true }),
  ];
  const agenda = buildAgenda(
    [prospect({ next_action_at: at(-1) }), prospect({ next_action_at: at(0) }), prospect({ next_action_at: at(0) })], [], NOW,
  );
  const m = computeMetrics(list, agenda);

  it('compte les dossiers actifs sans les archivés ni les refus', () => {
    expect(m.total).toBe(6);
    expect(m.active).toBe(5);
  });
  it('calcule le taux de réponse sur les contactés (réponse + intéressé + refus)', () => {
    expect(m.contacted).toBe(5);
    expect(m.answered).toBe(3);
    expect(m.responseRate).toBeCloseTo(0.6);
  });
  it('additionne la valeur des dossiers actifs seulement', () => {
    expect(m.pipelineValue).toBe(1350);
    expect(m.byStatus.refus).toEqual({ count: 1, value: 400 });
    expect(m.byStatus.interesse).toEqual({ count: 1, value: 1000 });
    expect(m.byStatus.relance_2).toEqual({ count: 0, value: 0 });
  });
  it('reprend les échéances de l’agenda', () => {
    expect(m.overdue).toBe(1);
    expect(m.dueToday).toBe(2);
  });
  it('compte un prospect une seule fois, « en retard » l’emportant sur « aujourd’hui »', () => {
    const p = prospect({ next_action_at: at(0) });
    const q = prospect({ next_action_at: at(0) });
    const a = buildAgenda([p, q], [
      task({ prospect_id: p.id, due_at: at(-2) }),
      task({ prospect_id: p.id, due_at: at(-1) }),
      task({ prospect_id: q.id, due_at: at(0, 18) }),
    ], NOW);
    expect(a).toHaveLength(5);
    const r = computeMetrics([p, q], a);
    expect(r.overdue).toBe(1);
    expect(r.dueToday).toBe(1);
    expect(r.overdue + r.dueToday).toBe(dueProspectIds(a).size);
  });
  it('ne donne pas de taux tant que personne n’a été contacté', () => {
    expect(computeMetrics([prospect()], []).responseRate).toBeNull();
    expect(computeMetrics([], []).pipelineValue).toBe(0);
  });
});

describe('filterProspects', () => {
  const a = prospect({ nom: 'Usinage du Rhône', ville: 'Lyon', dirigeant_nom: 'Hélène Martin', email: 'h.martin@usinage.fr', tags: ['Chaud', 'Industrie'], priority: 'high', status: 'contacte' });
  const b = prospect({ nom: 'Boulangerie Paul', ville: 'Nantes', tags: ['commerce'], status: 'a_qualifier' });
  const c = prospect({ nom: 'Vieux dossier', ville: 'Lyon', archived: true, email: '  ' });
  const all = [a, b, c];
  const run = (f: Partial<typeof EMPTY_FILTERS>, due?: Set<string>) => filterProspects(all, { ...EMPTY_FILTERS, ...f }, due).map((p) => p.id);

  it('masque les archivés par défaut', () => {
    expect(run({})).toEqual([a.id, b.id]);
    expect(run({ showArchived: true })).toEqual([a.id, b.id, c.id]);
  });
  it('cherche sans tenir compte des accents ni de la casse, tous les mots devant correspondre', () => {
    expect(run({ query: 'rhone' })).toEqual([a.id]);
    expect(run({ query: 'HELENE lyon' })).toEqual([a.id]);
    expect(run({ query: 'lyon nantes' })).toEqual([]);
    expect(run({ query: 'usinage.fr' })).toEqual([a.id]);
    expect(run({ query: 'industrie' })).toEqual([a.id]);
    expect(run({ query: '   ' })).toEqual([a.id, b.id]);
  });
  it('filtre par étape, priorité et étiquette', () => {
    expect(run({ status: 'contacte' })).toEqual([a.id]);
    expect(run({ priority: 'high' })).toEqual([a.id]);
    expect(run({ priority: 'normal' })).toEqual([b.id]); // priorité absente = normale
    expect(run({ tag: 'chaud' })).toEqual([a.id]);
    expect(run({ tag: 'Commerce' })).toEqual([b.id]);
  });
  it('filtre « à relancer » et « sans email »', () => {
    expect(run({ dueOnly: true }, new Set([b.id]))).toEqual([b.id]);
    expect(run({ dueOnly: true })).toEqual([]);
    expect(run({ noEmail: true, showArchived: true })).toEqual([b.id, c.id]); // un email vide ne compte pas
  });
  it('compte les filtres actifs', () => {
    expect(countActiveFilters(EMPTY_FILTERS)).toBe(0);
    expect(countActiveFilters({ ...EMPTY_FILTERS, query: ' x ', status: 'refus', noEmail: true })).toBe(3);
  });
});

describe('collectTags et addTag', () => {
  it('liste les étiquettes sans doublon, triées', () => {
    const list = [prospect({ tags: ['Industrie', 'chaud'] }), prospect({ tags: ['INDUSTRIE', 'Écologie'] }), prospect({ tags: null })];
    expect(collectTags(list)).toEqual(['chaud', 'Écologie', 'Industrie']);
  });
  it('ajoute proprement une étiquette', () => {
    expect(addTag(['Chaud'], '  à   rappeler ')).toEqual(['Chaud', 'à rappeler']);
    expect(addTag(['Chaud'], 'CHAUD')).toEqual(['Chaud']);
    expect(addTag(['Chaud'], '   ')).toEqual(['Chaud']);
    expect(addTag([], 'x'.repeat(80))[0]).toHaveLength(30);
    const full = Array.from({ length: TAGS_MAX }, (_, i) => `t${i}`);
    expect(addTag(full, 'de trop')).toBe(full);
  });
});

describe('sortProspects', () => {
  const a = prospect({ nom: 'Écrin', score: 2, status: 'interesse', priority: 'low', estimated_value: 500, next_action_at: at(3), last_contacted_at: at(-1) });
  const b = prospect({ nom: 'alpha', score: 6, status: 'a_qualifier', priority: 'high', estimated_value: null, next_action_at: null, last_contacted_at: null });
  const c = prospect({ nom: 'Zèbre', score: 4, status: 'contacte', estimated_value: 100, next_action_at: at(-2), last_contacted_at: at(-9) });
  const all = [a, b, c];
  const ids = (key: Parameters<typeof sortProspects>[1], dir: 'asc' | 'desc') => sortProspects(all, key, dir).map((p) => p.id);

  it('trie par nom sans se soucier des accents ni de la casse', () => {
    expect(ids('nom', 'asc')).toEqual([b.id, a.id, c.id]);
    expect(ids('nom', 'desc')).toEqual([c.id, a.id, b.id]);
  });
  it('trie par étape dans l’ordre du pipeline, par score et par priorité', () => {
    expect(ids('status', 'asc')).toEqual([b.id, c.id, a.id]);
    expect(ids('score', 'desc')).toEqual([b.id, c.id, a.id]);
    expect(ids('priority', 'desc')).toEqual([b.id, c.id, a.id]);
    expect(ids('priority', 'asc')).toEqual([a.id, c.id, b.id]);
  });
  it('garde les valeurs absentes en fin de liste dans les deux sens', () => {
    expect(ids('next_action', 'asc')).toEqual([c.id, a.id, b.id]);
    expect(ids('next_action', 'desc')).toEqual([a.id, c.id, b.id]);
    expect(ids('last_contact', 'desc')).toEqual([a.id, c.id, b.id]);
    expect(ids('value', 'asc')).toEqual([c.id, a.id, b.id]);
    expect(ids('value', 'desc')).toEqual([a.id, c.id, b.id]);
  });
  it('ne modifie pas la liste reçue', () => {
    sortProspects(all, 'nom', 'desc');
    expect(all.map((p) => p.id)).toEqual([a.id, b.id, c.id]);
  });
});

describe('validation des champs', () => {
  it('email', () => {
    expect(isValidEmail(' jean.dupont@exemple.fr ')).toBe(true);
    expect(isValidEmail('jean@exemple')).toBe(false);
    expect(isValidEmail('jean dupont@exemple.fr')).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });
  it('téléphone', () => {
    expect(isValidPhone('04 72 00 00 00')).toBe(true);
    expect(isValidPhone('+33 (0)6 12-34-56-78')).toBe(true);
    expect(isValidPhone('12345')).toBe(false);
    expect(isValidPhone('appeler le matin')).toBe(false);
    expect(isValidPhone('06 12 34 56 78 90 12 34 56')).toBe(false);
    expect(phoneHref('+33 6 12 34 56 78')).toBe('tel:+33612345678');
    expect(phoneHref('04.72.00.00.00')).toBe('tel:0472000000');
  });
  it('site web', () => {
    expect(normalizeWebsite('exemple.fr')).toBe('https://exemple.fr');
    expect(normalizeWebsite(' http://www.exemple.fr/ ')).toBe('http://www.exemple.fr');
    expect(normalizeWebsite('https://exemple.fr/contact')).toBe('https://exemple.fr/contact');
    expect(normalizeWebsite('javascript:alert(1)')).toBeNull();
    expect(normalizeWebsite('mailto:a@b.fr')).toBeNull();
    expect(normalizeWebsite('exemple')).toBeNull();
    expect(normalizeWebsite('mon site.fr')).toBeNull();
    expect(normalizeWebsite('')).toBeNull();
  });
  it('montant', () => {
    expect(parseAmount('250 000')).toBe(250000);
    expect(parseAmount('250 000 €')).toBe(250000);
    expect(parseAmount('1,5')).toBe(1.5);
    expect(parseAmount('300k')).toBe(300000);
    expect(parseAmount('1,2M')).toBe(1200000);
    expect(parseAmount('')).toBeNull();
    expect(parseAmount('beaucoup')).toBeNaN();
    expect(parseAmount('-5')).toBeNaN();
  });
  it('fold', () => {
    expect(fold('  Élève Rhône ')).toBe('eleve rhone');
    expect(fold(null)).toBe('');
  });
});

describe('scoreReasons', () => {
  it('reprend les règles du score de cession', () => {
    expect(scoreReasons(prospect({ anciennete: 22, dirigeant_age: 63, raw: { nature_juridique: '5710' } }))).toEqual([
      { kind: 'mature', years: 22 }, { kind: 'retirement', age: 63 }, { kind: 'legal_form' },
    ]);
    expect(scoreReasons(prospect({ anciennete: 12, dirigeant_age: 56 }))).toEqual([
      { kind: 'seniority', years: 12 }, { kind: 'transmission', age: 56 },
    ]);
    expect(scoreReasons(prospect({ anciennete: 3, dirigeant_age: 51, raw: { nature_juridique: '1000' } }))).toEqual([{ kind: 'age', age: 51 }]);
    expect(scoreReasons(prospect())).toEqual([]);
  });
});
