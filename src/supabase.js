import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const supabase = url && key ? createClient(url, key) : null
export const supabaseConfigured = Boolean(supabase)

export function publicPhotoUrl(path) {
  if (!supabase || !path) return ''
  return supabase.storage.from('trip-photos').getPublicUrl(path).data.publicUrl
}
