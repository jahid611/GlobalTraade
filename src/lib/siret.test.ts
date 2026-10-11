import { describe, expect, it } from "vitest";
import { cleanSiret, formatSiret, isValidSiret } from "./siret";

describe("SIRET", () => {
  it("ne garde que 14 chiffres", () => {
    expect(cleanSiret("443 061 841 00047")).toBe("44306184100047");
    expect(cleanSiret("abc44306184100047999")).toBe("44306184100047");
    expect(cleanSiret("lune")).toBe("");
  });

  it("accepte de vrais numéros", () => {
    expect(isValidSiret("44306184100047")).toBe(true); // Google France
    expect(isValidSiret("35600000000048")).toBe(true); // La Poste (règle particulière)
  });

  it("refuse un numéro inventé, incomplet ou mal recopié", () => {
    expect(isValidSiret("12345678901234")).toBe(false);
    expect(isValidSiret("44306184100048")).toBe(false); // dernier chiffre changé
    expect(isValidSiret("4430618410004")).toBe(false);
    expect(isValidSiret("00000000000000")).toBe(false);
    expect(isValidSiret("4430618410004A")).toBe(false);
    expect(isValidSiret("")).toBe(false);
  });

  it("met en forme pour la lecture", () => {
    expect(formatSiret("44306184100047")).toBe("443 061 841 00047");
  });
});
