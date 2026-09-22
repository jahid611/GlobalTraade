#!/usr/bin/env bash
# Tests des règles de sécurité SQL, sur un Postgres local jetable.
#
# Le principe : on reconstitue l'environnement Supabase (rôles, auth.uid(),
# policies RLS telles qu'en production), puis on rejoue dans la peau d'un
# membre les tentatives d'escalade de privilège. Sans le correctif, elles
# passent ; avec, elles sont toutes bloquées — et les gestes légitimes
# continuent de fonctionner.
#
#   ./scripts/test-sql.sh
#
# Nécessite psql (brew install postgresql@17) et un serveur local démarré.
set -euo pipefail

cd "$(dirname "$0")/.."

for p in /opt/homebrew/opt/postgresql@17/bin /opt/homebrew/opt/postgresql@16/bin /usr/local/opt/postgresql@17/bin; do
  [ -d "$p" ] && PATH="$p:$PATH"
done
export PATH

command -v psql >/dev/null || { echo "psql introuvable — brew install postgresql@17"; exit 2; }

DB="globly_sqltest_$$"
nettoyage() { dropdb --if-exists "$DB" 2>/dev/null || true; }
trap nettoyage EXIT

createdb "$DB"
psql -q -d "$DB" -f supabase/tests/00_stub_supabase.sql >/dev/null

# 1) Sans le correctif : les tests DOIVENT échouer, sinon ils ne prouvent rien.
echo "── Contrôle du banc d'essai (sans le correctif, des échecs sont attendus)"
if psql -q -d "$DB" -f supabase/tests/10_privileges.sql >/dev/null 2>&1; then
  echo "❌ Les tests passent SANS le correctif : ils ne testent rien."
  exit 1
fi
echo "   ✅ le banc d'essai reproduit bien la faille"

# 2) Avec le correctif : tout doit être vert.
echo
echo "── Avec supabase/_claude_sec_privileges.sql appliqué"
psql -q -d "$DB" -f supabase/_claude_sec_privileges.sql >/dev/null
psql -q -d "$DB" -f supabase/tests/10_privileges.sql 2>&1 | grep -vE "^(CREATE|GRANT|DROP|SET|INSERT|UPDATE|DELETE|DO)\b" || true
