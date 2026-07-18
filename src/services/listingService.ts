import { supabase } from '@/integrations/supabase/client';

export const uploadListingImage = async (base64Str: string, userId: string): Promise<string> => {
  if (!base64Str.startsWith('data:image')) return base64Str;
  
  const res = await fetch(base64Str);
  const blob = await res.blob();
  const fileName = `${userId}/${Date.now()}_${Math.random().toString(36).substring(2)}.jpg`;
  
  const { error } = await supabase.storage.from('listings').upload(fileName, blob, { contentType: 'image/jpeg' });
  if (error) throw new Error("Échec de l'upload de l'image sécurisée.");
  
  const { data: { publicUrl } } = supabase.storage.from('listings').getPublicUrl(fileName);
  return publicUrl;
};

export const saveListing = async (payload: any, listingId?: string, userId?: string) => {
  if (listingId) {
    if (!userId) throw new Error("Non autorisé.");
    // Vérification stricte : l'update ne s'exécute QUE si owner_id correspond au token
    const { error } = await supabase
      .from('listings')
      .update(payload)
      .eq('id', listingId)
      .eq('owner_id', userId);
      
    if (error) throw new Error(error.message);
  } else {
    let { error } = await supabase
      .from('listings')
      .insert([payload]);

    // Tolérance : tant que le patch SQL monétisation V3 n'est pas passé,
    // la colonne share_financials n'existe pas — on réessaie sans elle.
    if (error && /share_financials/i.test(error.message)) {
      const { share_financials, ...rest } = payload;
      ({ error } = await supabase.from('listings').insert([rest]));
    }

    if (error) throw new Error(error.message);
  }
};
