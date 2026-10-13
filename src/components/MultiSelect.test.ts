import { describe, expect, it } from 'vitest';
import { groupOptions, type MSOption } from './MultiSelect';

describe('groupOptions (en-têtes de groupe du sélecteur multiple)', () => {
  it('sans groupe : une seule liste, sans en-tête', () => {
    const options: MSOption[] = [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }];
    expect(groupOptions(options)).toEqual([{ group: '', options }]);
    expect(groupOptions([])).toEqual([]);
  });

  it("range les options qui se suivent sous le même titre, dans l'ordre reçu", () => {
    const out = groupOptions([
      { value: 'idf', label: 'Île-de-France', group: 'France' },
      { value: 'bre', label: 'Bretagne', group: 'France' },
      { value: 'ES-CT', label: 'Cataluña', group: 'Espagne' },
    ]);
    expect(out.map((g) => [g.group, g.options.map((o) => o.value)])).toEqual([
      ['France', ['idf', 'bre']],
      ['Espagne', ['ES-CT']],
    ]);
  });
});
