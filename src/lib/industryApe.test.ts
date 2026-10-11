import { describe, expect, it } from "vitest";
import { apeForIndustry, radarPathForIndustry } from "./industryApe";
import { APE_CODES } from "@/data/apeCodes";
import { INDUSTRIES } from "./industries";

describe("secteur → code APE", () => {
  it("trouve le code des métiers courants", () => {
    expect(apeForIndustry("Bakery-Pastry")).toBe("10.71C");
    expect(apeForIndustry("Bakery")).toBe("10.71C");
    expect(apeForIndustry("Hair Salon")).toBe("96.02A");
    expect(apeForIndustry("Car Garage")).toBe("45.20A");
    expect(apeForIndustry("Florist")).toBe("47.76Z");
    expect(apeForIndustry("Brasserie")).toBe("56.10A");
    expect(apeForIndustry("Boutique Hotel")).toBe("55.10Z");
    expect(apeForIndustry("Bookstore")).toBe("47.61Z");
    expect(apeForIndustry("Butcher Shop")).toBe("47.22Z");
    expect(apeForIndustry("Fast Food Restaurant")).toBe("56.10C");
  });

  it("ne renvoie que des codes de la liste du registre", () => {
    const known = new Set(APE_CODES.map((c) => c.code));
    for (const industry of INDUSTRIES) {
      const code = apeForIndustry(industry);
      if (code) expect(known.has(code)).toBe(true);
    }
  });

  it("couvre la grande majorité des secteurs du site", () => {
    const found = INDUSTRIES.filter((i) => apeForIndustry(i)).length;
    expect(found / INDUSTRIES.length).toBeGreaterThan(0.6);
  });

  it("ouvre la prospection sans code quand le secteur est inconnu", () => {
    expect(apeForIndustry(null)).toBeNull();
    expect(radarPathForIndustry("Zzz inconnu")).toBe("/radar");
    expect(radarPathForIndustry("Bakery")).toBe("/radar?ape=10.71C");
  });
});
