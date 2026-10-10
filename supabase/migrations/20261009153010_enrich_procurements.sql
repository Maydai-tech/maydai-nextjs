ALTER TABLE public.procurements
  ADD COLUMN phase text,
  ADD COLUMN criteria_importance jsonb,
  ADD COLUMN custom_questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN deadline_at timestamptz,
  ADD COLUMN supplier_emails text[] NOT NULL DEFAULT '{}',
  ADD CONSTRAINT procurements_phase_valid CHECK (phase IN ('consultation', 'rfi', 'rfp', 'final')),
  ADD CONSTRAINT procurements_questions_array CHECK (jsonb_typeof(custom_questions) = 'array'),
  ADD CONSTRAINT procurements_emails_no_null CHECK (array_position(supplier_emails, NULL) IS NULL),
  ADD CONSTRAINT procurements_importance_valid CHECK (
    criteria_importance IS NULL OR (
      jsonb_typeof(criteria_importance) = 'object'
      AND criteria_importance ?& ARRAY['human_oversight', 'transparency', 'social_ethics', 'environment', 'cybersecurity', 'data_governance']
      AND jsonb_typeof(criteria_importance->'human_oversight') = 'number'
      AND (criteria_importance->>'human_oversight') ~ '^(10|[0-9])$'
      AND jsonb_typeof(criteria_importance->'transparency') = 'number'
      AND (criteria_importance->>'transparency') ~ '^(10|[0-9])$'
      AND jsonb_typeof(criteria_importance->'social_ethics') = 'number'
      AND (criteria_importance->>'social_ethics') ~ '^(10|[0-9])$'
      AND jsonb_typeof(criteria_importance->'environment') = 'number'
      AND (criteria_importance->>'environment') ~ '^(10|[0-9])$'
      AND jsonb_typeof(criteria_importance->'cybersecurity') = 'number'
      AND (criteria_importance->>'cybersecurity') ~ '^(10|[0-9])$'
      AND jsonb_typeof(criteria_importance->'data_governance') = 'number'
      AND (criteria_importance->>'data_governance') ~ '^(10|[0-9])$'
    )
  );

-- NULL configuration preserves the meaning of historical, minimal procurements.
-- Existing ownership policies and privileges continue to protect every column.
NOTIFY pgrst, 'reload schema';
