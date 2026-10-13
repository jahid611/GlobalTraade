import { describe, it, expect } from 'vitest';
import { format, formatDistance } from 'date-fns';
import { dateLocaleFor } from './dateLocale';

describe('dateLocaleFor', () => {
  const day = new Date(2026, 9, 13);
  it('rend la langue demandée pour les six langues du site', () => {
    expect(format(day, 'd MMMM', { locale: dateLocaleFor('fr') })).toBe('13 octobre');
    expect(format(day, 'd MMMM', { locale: dateLocaleFor('en') })).toBe('13 October');
    expect(format(day, 'd MMMM', { locale: dateLocaleFor('es') })).toBe('13 octubre');
    expect(format(day, 'd MMMM', { locale: dateLocaleFor('it') })).toBe('13 ottobre');
    expect(format(day, 'd MMMM', { locale: dateLocaleFor('pt') })).toBe('13 outubro');
    expect(format(day, 'd MMMM', { locale: dateLocaleFor('de') })).toBe('13 Oktober');
  });
  it('accepte une langue avec région et revient au français sinon', () => {
    expect(dateLocaleFor('de-AT').code).toBe('de');
    expect(dateLocaleFor('EN').code).toBe('en-GB');
    expect(dateLocaleFor('ja').code).toBe('fr');
    expect(dateLocaleFor(undefined).code).toBe('fr');
    expect(dateLocaleFor(null).code).toBe('fr');
  });
  it('écrit les durées dans la langue', () => {
    const from = new Date(2026, 9, 10);
    expect(formatDistance(from, day, { addSuffix: true, locale: dateLocaleFor('de') })).toBe('vor 3 Tagen');
    expect(formatDistance(from, day, { addSuffix: true, locale: dateLocaleFor('fr') })).toBe('il y a 3 jours');
  });
});
