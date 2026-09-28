import{createClient}from'@supabase/supabase-js';
const url=import.meta.env.VITE_SUPABASE_URL,key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const supabase=createClient(url,key);
export const photoUrl=p=>supabase.storage.from('trip-photos').getPublicUrl(p).data.publicUrl;
