// Avis de l'administration au membre : identité validée ou refusée, projet
// validé ou refusé, compte suspendu ou réactivé. Écrits par la base
// (supabase/_claude_admin_decisions.sql) ; le membre ne peut que les lire et
// les marquer comme lus.

import { supabase } from '@/integrations/supabase/client';

export type NoticeKind =
  | 'kyc_verified' | 'kyc_rejected' | 'kyc_reset'
  | 'project_verified' | 'project_rejected'
  | 'account_suspended' | 'account_restored';

export interface MemberNotice {
  id: string;
  kind: NoticeKind;
  reason: string | null;
  target_type: string | null;
  target_id: string | null;
  target_label: string | null;
  created_at: string;
  read_at: string | null;
}

const COLUMNS = 'id, kind, reason, target_type, target_id, target_label, created_at, read_at';

/** Les 30 derniers avis du membre connecté, du plus récent au plus ancien. */
export async function listMyNotices(userId: string): Promise<MemberNotice[]> {
  const { data, error } = await supabase
    .from('member_notices').select(COLUMNS).eq('user_id', userId)
    .order('created_at', { ascending: false }).limit(30);
  if (error) return [];
  return (data || []) as MemberNotice[];
}

export async function markNoticesRead(ids: string[]) {
  if (!ids.length) return;
  await supabase.rpc('mark_notices_read', { p_ids: ids });
}

/** Le dernier avis d'un type donné (et d'une cible donnée), pour rappeler un motif près de l'élément concerné. */
export function latestNotice(notices: MemberNotice[] | undefined, kind: NoticeKind, targetId?: string | null): MemberNotice | null {
  return (notices || []).find((n) => n.kind === kind && (!targetId || n.target_id === targetId)) || null;
}
