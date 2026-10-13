import { describe, it, expect } from 'vitest';
import { loadMarketContent } from '@/lib/marketContent';
import { defaultDdTasks, ddExplanation, GENERIC_DD_TASKS } from './dueDiligenceDefaults';

describe("liste de départ de l'audit", () => {
  it.each(['FR', 'ES', 'PT', 'DE', 'IT', 'GB'])('%s : douze tâches, trois par rubrique, au nom local', async (code) => {
    const content = await loadMarketContent(code);
    const tasks = defaultDdTasks(content);
    expect(tasks).toHaveLength(12);
    ['governance', 'financial', 'legal', 'social'].forEach((cat) => expect(tasks.filter((t) => t.category === cat)).toHaveLength(3));
    tasks.forEach((task, i) => {
      expect(task.title).toBe(content!.dueDiligence[i].localName);
      expect(task.title.startsWith('dd.task_')).toBe(false);
      expect(ddExplanation(content, task.title, 'fr')).toBe(content!.dueDiligence[i].what.fr);
    });
  });

  it('une annonce allemande ne demande pas de Kbis', async () => {
    const tasks = defaultDdTasks(await loadMarketContent('DE'));
    expect(tasks.some((t) => /kbis/i.test(t.title))).toBe(false);
    expect(tasks[0].title).toMatch(/Handelsregisterauszug/);
  });

  it('pays sans contenu : la liste générique, par clés traduites', async () => {
    const content = await loadMarketContent('BE');
    expect(content).toBeNull();
    expect(defaultDdTasks(content)).toBe(GENERIC_DD_TASKS);
    expect(GENERIC_DD_TASKS).toHaveLength(12);
    expect(GENERIC_DD_TASKS.every((t) => /^dd\.task_(gov|fin|leg|soc)[123]$/.test(t.title))).toBe(true);
  });

  it("l'explication suit la langue du visiteur et ignore la casse et les espaces", async () => {
    const es = await loadMarketContent('ES');
    const name = es!.dueDiligence[0].localName;
    expect(ddExplanation(es, `  ${name.toUpperCase()} `, 'de')).toBe(es!.dueDiligence[0].what.de);
    expect(ddExplanation(es, name, 'en-GB')).toBe(es!.dueDiligence[0].what.en);
  });

  it("pas d'explication pour une tâche libre, une ancienne clé ou sans contenu", async () => {
    const es = await loadMarketContent('ES');
    expect(ddExplanation(es, 'Mon document à moi', 'fr')).toBe('');
    expect(ddExplanation(es, 'dd.task_leg1', 'fr')).toBe('');
    expect(ddExplanation(null, es!.dueDiligence[0].localName, 'fr')).toBe('');
    expect(ddExplanation(es, '', 'fr')).toBe('');
  });
});
