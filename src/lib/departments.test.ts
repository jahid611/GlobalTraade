import { describe, expect, it } from "vitest";
import { DEPARTMENTS, canonicalDepartment, departmentName, departmentOptions, isDepartment } from "./departments";

describe("départements", () => {
  it("contient les 101 départements, sans doublon", () => {
    expect(DEPARTMENTS).toHaveLength(101);
    expect(new Set(DEPARTMENTS.map((d) => d.code)).size).toBe(101);
  });

  it("refuse ce qui n'est pas un département", () => {
    for (const v of ["ok", "lune", "20", "96", "00", "975", "6969", " "]) {
      expect(canonicalDepartment(v)).toBe("");
      expect(isDepartment(v)).toBe(false);
    }
  });

  it("reconnaît les codes, y compris la Corse et l'outre-mer", () => {
    expect(canonicalDepartment("69")).toBe("69");
    expect(canonicalDepartment(" 1 ")).toBe("01");
    expect(canonicalDepartment("2a")).toBe("2A");
    expect(canonicalDepartment("974")).toBe("974");
    expect(departmentName("75")).toBe("Paris");
  });

  it("propose « toute la France » en premier", () => {
    const options = departmentOptions("Toute la France");
    expect(options[0]).toEqual({ value: "", label: "Toute la France" });
    expect(options).toHaveLength(102);
  });
});
