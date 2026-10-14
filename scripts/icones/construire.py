"""Reconstruit les icônes Globly : python3 scripts/icones/construire.py

Les dessins sont décrits dans lot1.py à lot4.py (voir atelier.py pour les rôles
b, d, s, f, k). Ce script écrit src/components/icons/defs.ts, index.tsx et ph.tsx,
et, avec l'option --planche, une image de contrôle assets/icones-globly.png (macOS).
"""
import json, os, sys
ICI = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, ICI)
import atelier, lot1, lot2, lot3, lot4  # noqa: E402,F401
from atelier import ICONS, ALIAS  # noqa: E402

RACINE = os.path.dirname(os.path.dirname(ICI))
DEST = os.path.join(RACINE, "src", "components", "icons")
assert all(cible in ICONS for cible in ALIAS.values())

defs = ("// Fichier généré par scripts/icones/construire.py : ne pas le modifier à la main.\n"
        "// Les tracés des icônes Globly (grille de 24).\n"
        "// Chaque icône : [corps, détails, traits, pleins, pleins posés sur le corps].\n"
        "// Voir create.tsx pour la façon dont ces rôles sont dessinés.\n"
        "export type IconDef = readonly [b: string, d: string, s: string, f: string, k: string];\n\nexport const DEFS = {\n")
for nom, v in ICONS.items():
    defs += f"  {nom}: {json.dumps([''.join(v[r]) for r in 'bdsfk'])},\n"
defs += "} as const satisfies Record<string, IconDef>;\n"
open(os.path.join(DEST, "defs.ts"), "w").write(defs)

# Un même nom ne voulait pas toujours dire la même chose dans les deux anciennes
# bibliothèques : « List » était une liste à puces dans l'une, le bouton du menu dans l'autre.
PH_AUTREMENT = {"List": "Menu"}

def module(titre, autre, taille, autrement={}):
    o = (f"// Fichier généré par scripts/icones/construire.py : ne pas le modifier à la main.\n// {titre}\n// {autre}\n"
         'import { createIcon } from "./create";\nimport { DEFS, type IconDef } from "./defs";\n\n'
         'export type { Icon, IconProps, IconWeight } from "./create";\n\n'
         f"const icon = (def: IconDef) => createIcon(def, {taille});\n\n")
    for nom in ICONS: o += f"export const {nom} = /*#__PURE__*/ icon(DEFS.{autrement.get(nom, nom)});\n"
    o += "\n// Les autres noms sous lesquels l'application demande ces icônes.\n"
    for a, cible in sorted(ALIAS.items()): o += f"export const {a} = {cible};\n"
    return o
open(os.path.join(DEST, "index.tsx"), "w").write(module("Toutes les icônes Globly, taille 24 par défaut.", "(Mêmes dessins dans ./ph, dont la taille par défaut suit celle du texte.)", "24"))
open(os.path.join(DEST, "ph.tsx"), "w").write(module("Toutes les icônes Globly, à la taille du texte par défaut (1em).", "(Mêmes dessins dans ./index, en taille 24 par défaut.)", '"1em"', PH_AUTREMENT))
print(len(ICONS), "dessins,", len(ALIAS), "alias")

if "--planche" in sys.argv:
    os.chdir(os.path.join(RACINE, "assets"))
    atelier.sheet(list(ICONS), "icones-globly.svg", cols=10)
    os.remove("icones-globly.svg.png")
