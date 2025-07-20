import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (_error) { // DEĞİŞİKLİK BURADA: 'error' yerine '_error'
            // 'set' metodu bir Sunucu Bileşeninden çağrıldı.
            // Bu, kullanıcı oturumlarını yenileyen bir middleware'iniz varsa göz ardı edilebilir.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (_error) { // DEĞİŞİKLİK BURADA: 'error' yerine '_error'
            // 'delete' metodu bir Sunucu Bileşeninden çağrıldı.
            // Bu, kullanıcı oturumlarını yenileyen bir middleware'iniz varsa göz ardı edilebilir.
          }
        },
      },
    }
  )
}