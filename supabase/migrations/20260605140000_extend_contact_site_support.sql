-- ==========================================
-- MIGRATION UP
-- Extension non-destructive de public.contact_site (support omnicanal)
-- Alignée sur lib/validations/contact.ts (Zod source of truth)
-- ==========================================

-- 1. Nouvelles colonnes (valeurs par défaut pour les lignes existantes)
ALTER TABLE public.contact_site
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS usecase_id uuid REFERENCES public.usecases (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'contact_page';

-- 2. Contraintes CHECK sur status et source
ALTER TABLE public.contact_site
  DROP CONSTRAINT IF EXISTS contact_site_status_check;

ALTER TABLE public.contact_site
  ADD CONSTRAINT contact_site_status_check CHECK (
    status IN ('new', 'in_progress', 'closed')
  );

ALTER TABLE public.contact_site
  DROP CONSTRAINT IF EXISTS contact_site_source_check;

ALTER TABLE public.contact_site
  ADD CONSTRAINT contact_site_source_check CHECK (
    source IN (
      'contact_page',
      'support_page',
      'dashboard_support',
      'settings'
    )
  );

-- 3. Extension de la liste des sujets (5 existants + 6 nouveaux)
ALTER TABLE public.contact_site
  DROP CONSTRAINT contact_site_subject_check;

ALTER TABLE public.contact_site
  ADD CONSTRAINT contact_site_subject_check CHECK (
    subject IN (
      'Support & Démo',
      'Presse & Média',
      'Partenariats & Fournisseurs',
      'Carrières',
      'Audit personnalisé',
      'Compte — changement d''email',
      'Plateforme — utilisation',
      'IA Act — réglementation',
      'Formation & conformité',
      'Facturation & abonnement',
      'Autre demande'
    )
  );

-- 4. Suppression de la policy RLS doublonnée (conserver contact_site_insert_anon)
DROP POLICY IF EXISTS "Autoriser l'insertion pour le formulaire public" ON public.contact_site;

-- ==========================================
-- MIGRATION DOWN (rollback manuel — exécuter dans l'ordre)
-- ==========================================
-- Recréer la policy RLS supprimée :
-- CREATE POLICY "Autoriser l'insertion pour le formulaire public"
--   ON public.contact_site
--   FOR INSERT
--   TO anon
--   WITH CHECK (true);
--
-- Restaurer la contrainte subject (5 valeurs d'origine) :
-- ALTER TABLE public.contact_site DROP CONSTRAINT IF EXISTS contact_site_subject_check;
-- ALTER TABLE public.contact_site
--   ADD CONSTRAINT contact_site_subject_check CHECK (
--     subject IN (
--       'Support & Démo',
--       'Presse & Média',
--       'Partenariats & Fournisseurs',
--       'Carrières',
--       'Audit personnalisé'
--     )
--   );
--
-- Supprimer les contraintes CHECK ajoutées :
-- ALTER TABLE public.contact_site DROP CONSTRAINT IF EXISTS contact_site_source_check;
-- ALTER TABLE public.contact_site DROP CONSTRAINT IF EXISTS contact_site_status_check;
--
-- Supprimer les colonnes ajoutées (FK incluses) :
-- ALTER TABLE public.contact_site DROP COLUMN IF EXISTS source;
-- ALTER TABLE public.contact_site DROP COLUMN IF EXISTS usecase_id;
-- ALTER TABLE public.contact_site DROP COLUMN IF EXISTS company_id;
-- ALTER TABLE public.contact_site DROP COLUMN IF EXISTS user_id;
-- ALTER TABLE public.contact_site DROP COLUMN IF EXISTS status;
