import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useUnreadMessages(userId: string | undefined) {
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    if (!userId) {
      setHasUnread(false);
      return;
    }

    const checkUnread = async () => {
      // On vérifie directement en base si l'utilisateur a des messages non lus (is_read = false)
      const { data } = await supabase
        .from('messages')
        .select('id')
        .eq('receiver_id', userId)
        .eq('is_read', false)
        .limit(1);

      setHasUnread(data && data.length > 0);
    };

    checkUnread();

    // Écoute temps réel optimisée (écoute tout changement sur les messages reçus)
    const channel = supabase
      .channel(`unread_status_${userId}`)
      .on(
        'postgres_changes', 
        { event: '*', schema: 'public', table: 'messages', filter: `receiver_id=eq.${userId}` }, 
        () => checkUnread()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return hasUnread;
}