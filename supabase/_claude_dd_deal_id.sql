-- Génération de la check-list d'audit (DueDiligenceTracker) en échec :
--   null value in column "deal_id" of relation "due_diligence_tasks"
--   violates not-null constraint
--
-- Contexte : la colonne deal_id (clé composite historique "{buyer_id}_{listing_id}")
-- était NOT NULL, mais le code d'insertion actuel ne la renseigne plus. Les RLS
-- actives se basent désormais sur buyer_id / seller_id (et non plus sur deal_id),
-- et aucune FK ne repose sur cette colonne : deal_id est donc devenu un vestige.
-- On la rend nullable pour laisser passer les inserts de la check-list.
--
-- Second point bloquant : handleGenerateDefault insère la catégorie 'governance',
-- absente de la contrainte CHECK sur category → l'insert échouait aussi. On ajoute
-- 'governance' à la liste des catégories autorisées (ajout purement additif).
--
-- À coller dans Supabase Studio > SQL Editor (idempotent).

-- 1) deal_id nullable
ALTER TABLE public.due_diligence_tasks ALTER COLUMN deal_id DROP NOT NULL;

-- 2) Autoriser la catégorie 'governance' (utilisée par la check-list par défaut)
ALTER TABLE public.due_diligence_tasks
  DROP CONSTRAINT IF EXISTS due_diligence_tasks_category_check;
ALTER TABLE public.due_diligence_tasks
  ADD CONSTRAINT due_diligence_tasks_category_check
  CHECK (category = ANY (ARRAY[
    'governance','financial','legal','social','operational','tax','environmental'
  ]));
