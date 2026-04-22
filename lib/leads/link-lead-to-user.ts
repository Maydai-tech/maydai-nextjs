import { createClient } from '@supabase/supabase-js';

/**
 * Met à jour un lead après inscription (contourne la RLS via la clé service).
 * @param leadId UUID du lead (`leads.id`)
 * @param userId UUID Supabase Auth (`auth.users.id`)
 */
export async function linkLeadToUser(
  leadId: string,
  userId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return { ok: false, error: 'Configuration Supabase service manquante' };
  }

  const supabase = createClient(url, key);
  const now = new Date().toISOString();

  const { data, error } = await (supabase as any)
    .from('leads')
    .update({
      converted_to_user_id: userId,
      funnel_stage: 1,
      converted_at: now,
    })
    .eq('id', leadId)
    .select('id');

  if (error) {
    return { ok: false, error: error.message };
  }

  if (!Array.isArray(data) || data.length === 0) {
    return { ok: false, error: 'Aucun lead trouvé pour cet id' };
  }

  return { ok: true };
}
